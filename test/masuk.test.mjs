// Login peneliti diuji pakai SQLite beneran (node:sqlite) dengan skema.sql yang sama, dibungkus mirip API D1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { minta, cek, siapa, keluar, laporan, bolehForm, ambilCookie, normalEmail } from '../src/masuk.js';

function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../skema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, a = []) => ({
    bind: (...b) => stmt(sql, b),
    first: async () => db.prepare(sql).get(...a) ?? null,
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...a).changes) } }),
    all: async () => ({ results: db.prepare(sql).all(...a) }),
  });
  return { prepare: (sql) => stmt(sql), batch: async (l) => { for (const s of l) await s.run(); }, db };
}
function siapkan() {
  const DB = d1();
  DB.db.exec(`INSERT INTO peneliti VALUES ('dosen@ut.ac.id', '*'), ('tp@ut.ac.id', 'ut-tp')`);
  DB.db.exec(`INSERT INTO jawaban VALUES ('a', 'ut-tp', '2026-11-20', '2026-11-20', NULL, '{"id":"a","form":"ut-tp"}'), ('b', 'ut-pai', '2026-11-20', '2026-11-20', NULL, '{"id":"b"}')`);
  const terkirim = [];
  const ambil = async (url, opsi) => { terkirim.push(JSON.parse(opsi.body)); return { ok: true }; };
  return { env: { DB, RESEND_API_KEY: 'tes' }, terkirim, ambil };
}
const kodeDari = (surat) => surat.text.match(/\d{6}/)[0];
const cookieDari = (h) => h.cookie.split(';')[0];

test('email tidak terdaftar: jawaban sama, tidak ada email terkirim', async () => {
  const { env, terkirim, ambil } = siapkan();
  assert.deepEqual((await minta({ email: 'orang@lain.com' }, env, ambil)).isi, { ok: true });
  assert.equal(terkirim.length, 0);
  assert.equal((await minta({ email: 'bukan email' }, env, ambil)).status, 400);
});

test('alur masuk lengkap, kode disimpan sebagai hash, sesi bisa keluar', async () => {
  const { env, terkirim, ambil } = siapkan();
  assert.equal((await minta({ email: ' Dosen@UT.ac.id ' }, env, ambil)).status, 200);
  const kode = kodeDari(terkirim[0]);
  assert.deepEqual(terkirim[0].to, ['dosen@ut.ac.id']);
  assert.ok(!JSON.stringify(env.DB.db.prepare('SELECT * FROM kode_masuk').all()).includes(kode));
  const h = await cek({ email: 'dosen@ut.ac.id', kode }, env);
  assert.equal(h.status, 200);
  assert.match(h.cookie, /HttpOnly; Secure; SameSite=Strict/);
  const orang = await siapa(cookieDari(h), env);
  assert.equal(orang.email, 'dosen@ut.ac.id');
  assert.equal((await cek({ email: 'dosen@ut.ac.id', kode }, env)).status, 401, 'kode sekali pakai');
  await keluar(cookieDari(h), env);
  assert.equal(await siapa(cookieDari(h), env), null);
});

test('kode salah 5 kali mengunci kode itu, kode benar pun ditolak', async () => {
  const { env, terkirim, ambil } = siapkan();
  await minta({ email: 'dosen@ut.ac.id' }, env, ambil);
  const kode = kodeDari(terkirim[0]);
  const salah = kode === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal((await cek({ email: 'dosen@ut.ac.id', kode: salah }, env)).status, 401);
  assert.equal((await cek({ email: 'dosen@ut.ac.id', kode }, env)).status, 401);
});

test('minta 2x, kode dari email pertama tetap bisa dipakai', async () => {
  const { env, terkirim, ambil } = siapkan();
  await minta({ email: 'dosen@ut.ac.id' }, env, ambil);
  await minta({ email: 'dosen@ut.ac.id' }, env, ambil);
  assert.equal((await cek({ email: 'dosen@ut.ac.id', kode: kodeDari(terkirim[0]) }, env)).status, 200);
});

test('minta kode dibatasi 3 per 15 menit', async () => {
  const { env, terkirim, ambil } = siapkan();
  for (let i = 0; i < 4; i++) assert.deepEqual((await minta({ email: 'dosen@ut.ac.id' }, env, ambil)).isi, { ok: true }, 'jawaban sama dengan email tak terdaftar');
  assert.equal(terkirim.length, 3);
});

test('kode yang sudah kedaluwarsa tetap dihitung sampai 15 menit', async () => {
  const { env, terkirim, ambil } = siapkan();
  const t = Date.now() - 12 * 60_000;
  for (let i = 0; i < 3; i++) env.DB.db.prepare('INSERT INTO kode_masuk VALUES (?, ?, ?, 0, ?)').run('dosen@ut.ac.id', 'x', t + 10 * 60_000, t + i);
  await minta({ email: 'dosen@ut.ac.id' }, env, ambil);
  assert.equal(terkirim.length, 0);
});

test('Resend gagal: 502 dan kodenya dibuang', async () => {
  const { env } = siapkan();
  const h = await minta({ email: 'dosen@ut.ac.id' }, env, async () => ({ ok: false, status: 500 }));
  assert.equal(h.status, 502);
  assert.equal(env.DB.db.prepare('SELECT COUNT(*) AS n FROM kode_masuk').get().n, 0);
  assert.equal((await minta({ email: 'dosen@ut.ac.id' }, { DB: env.DB }, async () => ({ ok: true }))).status, 502, 'tanpa kunci = gagal');
});

test('akses laporan per form', async () => {
  const { env } = siapkan();
  assert.deepEqual((await laporan({ forms: 'ut-tp' }, 'ut-tp', env)).isi.baris, [{ id: 'a', form: 'ut-tp' }]);
  assert.equal((await laporan({ forms: 'ut-tp' }, 'ut-pai', env)).status, 403);
  assert.equal((await laporan({ forms: '*' }, 'ut-pai', env)).status, 200);
  assert.equal((await laporan({ forms: '*' }, 'ngawur', env)).status, 403);
  assert.ok(bolehForm('ut-tp, ut-pai', 'ut-pai'));
  assert.equal(ambilCookie('x=1; sesi_uji=abc', 'sesi_uji'), 'abc');
  assert.equal(normalEmail('a@b'), null);
});

test('peneliti dihapus dari tabel langsung kehilangan sesi', async () => {
  const { env, terkirim, ambil } = siapkan();
  await minta({ email: 'tp@ut.ac.id' }, env, ambil);
  const h = await cek({ email: 'tp@ut.ac.id', kode: kodeDari(terkirim[0]) }, env);
  env.DB.db.exec(`DELETE FROM peneliti WHERE email = 'tp@ut.ac.id'`);
  assert.equal(await siapa(cookieDari(h), env), null);
});

test('pembatas per IP: binding hilang/error = ditolak, kunci pakai IP', async () => {
  const { lolosBatas } = await import('../src/masuk.js');
  const kunci = [];
  const batas = (success) => ({ limit: async ({ key }) => { kunci.push(key); return { success }; } });
  assert.equal(await lolosBatas({}, '1.2.3.4'), false);
  assert.equal(await lolosBatas({ BATAS_MASUK: { limit: async () => { throw new Error('x'); } } }, '1.2.3.4'), false);
  assert.equal(await lolosBatas({ BATAS_MASUK: batas(false) }, '1.2.3.4'), false);
  assert.equal(await lolosBatas({ BATAS_MASUK: batas(true) }, '1.2.3.4'), true);
  assert.deepEqual(kunci, ['masuk:1.2.3.4', 'masuk:1.2.3.4']);
});
