// Login peneliti: kode 6 angka lewat email (Resend), lalu sesi di cookie. Yang disimpan di D1 cuma hash kode/token.
//   POST /uji/api/masuk/minta  {email}         -> kirim kode kalau email terdaftar; jawabannya selalu sama (A07)
//   POST /uji/api/masuk/cek    {email, kode}   -> sesi baru, cookie sesi_uji
//   POST /uji/api/keluar                       -> hapus sesi
//   GET  /uji/api/saya                         -> {email, forms}
//   GET  /uji/api/laporan?form=<kode>          -> {baris: [...]} kalau peneliti punya akses ke form itu
import { FORM_SAH } from './simpan.js';

const MENIT = 60_000;
const UMUR_KODE = 10 * MENIT;
const UMUR_SESI = 7 * 24 * 60 * MENIT;
const MAKS_COBA = 5; // per kode
const MAKS_MINTA = 3; // per email per 15 menit
const COOKIE = 'sesi_uji';

export const normalEmail = (v) => {
  const e = String(v ?? '').trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};
export const ambilCookie = (header, nama) =>
  (header || '').split(';').map((x) => x.trim().split('=')).find(([k]) => k === nama)?.[1] || null;
export const bolehForm = (forms, kode) => FORM_SAH.includes(kode) && (forms === '*' || forms.split(',').map((x) => x.trim()).includes(kode));
export const daftarForm = (forms) => (forms === '*' ? [...FORM_SAH] : FORM_SAH.filter((k) => bolehForm(forms, k)));

// Pembatas per IP buat semua yang nyoba masuk, terdaftar atau tidak (binding ratelimits BATAS_MASUK, 10/menit).
// Gagal = tutup: binding hilang atau error dianggap ditolak.
export async function lolosBatas(env, ip) {
  if (!env.BATAS_MASUK) return false;
  try { return (await env.BATAS_MASUK.limit({ key: `masuk:${ip || 'tanpa-ip'}` })).success === true; } catch { return false; }
}

export async function hash(teks) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const acakKode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
const acakToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map((x) => x.toString(16).padStart(2, '0')).join('');

async function kirimKode(env, email, kode, ambil) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY belum dipasang');
  const r = await ambil('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: 'Nyalain <nyalain@kitaterangin.id>', to: [email], subject: `Kode masuk laporan uji coba: ${kode}`,
      text: `Kode masuk Anda: ${kode}\n\nMasukkan kode ini di halaman laporan uji coba video pembelajaran. Kode berlaku 10 menit.\n\nBila Anda tidak meminta kode ini, abaikan email ini.\n\nNyalain`,
    }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}`);
}

export async function minta(body, env, ambil = fetch) {
  const email = normalEmail(body?.email);
  if (!email) return { status: 400, isi: { ok: false, galat: 'email' } };
  const sekarang = Date.now();
  // Yang dibuang cuma kode lebih tua dari jendela batas minta (15 menit), bukan yang baru kedaluwarsa (10 menit):
  // kalau dibuang pas kedaluwarsa, batas 3 per 15 menit jadi bocor ke 3 per 10 menit.
  await env.DB.prepare('DELETE FROM kode_masuk WHERE dibuat < ?1').bind(sekarang - 15 * MENIT).run();
  const terdaftar = await env.DB.prepare('SELECT 1 FROM peneliti WHERE email = ?1').bind(email).first();
  if (terdaftar) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM kode_masuk WHERE email = ?1 AND dibuat > ?2').bind(email, sekarang - 15 * MENIT).first();
    // Kena batas: diam-diam nggak kirim, jawabannya sama dengan email tak terdaftar (429 di sini bikin email terdaftar ketahuan).
    if (n >= MAKS_MINTA) return { status: 200, isi: { ok: true }, log: 'batas-per-email' };
    const kode = acakKode();
    await env.DB.prepare('INSERT INTO kode_masuk (email, hash, kedaluwarsa, coba, dibuat) VALUES (?1, ?2, ?3, 0, ?4)')
      .bind(email, await hash(`${email}:${kode}`), sekarang + UMUR_KODE, sekarang).run();
    // ponytail: kalau Resend gagal, email terdaftar dapat 502 sedangkan yang tidak terdaftar dapat ok; bocor cuma pas Resend mati.
    try { await kirimKode(env, email, kode, ambil); } catch (e) {
      await env.DB.prepare('DELETE FROM kode_masuk WHERE email = ?1 AND dibuat = ?2').bind(email, sekarang).run();
      return { status: 502, isi: { ok: false, galat: 'email-gagal' }, log: String(e?.message || e) };
    }
  }
  return { status: 200, isi: { ok: true } };
}

export async function cek(body, env) {
  const email = normalEmail(body?.email);
  const kode = String(body?.kode ?? '').slice(0, 20).replace(/[\s-]/g, ''); // "123 456" / "123-456" dari email
  if (!email || !/^\d{6}$/.test(kode)) return { status: 400, isi: { ok: false, galat: 'format' } };
  const sekarang = Date.now();
  // Semua kode yang masih berlaku diterima (dosen bisa minta 2x lalu pakai kode dari email pertama). Maks 3 kode aktif
  // (batas minta), tiap tebakan ngurangin jatah semua kode sekaligus.
  const { results: aktif } = await env.DB.prepare('SELECT rowid AS id, hash FROM kode_masuk WHERE email = ?1 AND kedaluwarsa > ?2 AND coba < ?3')
    .bind(email, sekarang, MAKS_COBA).all();
  if (!aktif.length) return { status: 401, isi: { ok: false, galat: 'kode' } };
  // Tambah hitungan coba dulu, baru dibandingkan: tebakan paralel tetap kena batas.
  const h = await hash(`${email}:${kode}`);
  let cocok = false;
  for (const k of aktif) {
    const naik = await env.DB.prepare('UPDATE kode_masuk SET coba = coba + 1 WHERE rowid = ?1 AND coba < ?2').bind(k.id, MAKS_COBA).run();
    if (naik.meta.changes && k.hash === h) cocok = true;
  }
  if (!cocok) return { status: 401, isi: { ok: false, galat: 'kode' } };
  const token = acakToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM kode_masuk WHERE email = ?1').bind(email),
    env.DB.prepare('DELETE FROM sesi WHERE kedaluwarsa < ?1').bind(sekarang),
    env.DB.prepare('INSERT INTO sesi (hash, email, kedaluwarsa) VALUES (?1, ?2, ?3)').bind(await hash(token), email, sekarang + UMUR_SESI),
  ]);
  return { status: 200, isi: { ok: true }, cookie: `${COOKIE}=${token}; Path=/uji; Max-Age=${UMUR_SESI / 1000}; HttpOnly; Secure; SameSite=Strict` };
}

// Sesi + akses peneliti saat ini, atau null. Peneliti yang dihapus dari tabel langsung kehilangan akses.
export async function siapa(cookieHeader, env) {
  const token = ambilCookie(cookieHeader, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const h = await hash(token);
  return env.DB.prepare('SELECT s.email, p.forms, s.hash FROM sesi s JOIN peneliti p ON p.email = s.email WHERE s.hash = ?1 AND s.kedaluwarsa > ?2')
    .bind(h, Date.now()).first();
}

export async function keluar(cookieHeader, env) {
  const token = ambilCookie(cookieHeader, COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sesi WHERE hash = ?1').bind(await hash(token)).run();
  return `${COOKIE}=; Path=/uji; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function laporan(orang, kode, env) {
  if (!bolehForm(orang.forms, kode)) return { status: 403, isi: { ok: false } };
  const { results } = await env.DB.prepare('SELECT data FROM jawaban WHERE form = ?1 ORDER BY mulai').bind(kode).all();
  return { status: 200, isi: { ok: true, baris: results.map((r) => JSON.parse(r.data)) } };
}
