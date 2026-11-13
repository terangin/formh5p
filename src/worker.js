// Worker nyalain.kitaterangin.id/uji* (akun Cloudflare Terangin). Sisa domain tetap ke PocketBase rumah lewat tunnel.
//   GET  /uji/<kode form>   -> halaman form (public/uji/index.html)
//   POST /uji/api/simpan    -> simpan/ubah jawaban ke D1 (dikunci setelah "selesai")
//   GET  /uji/*             -> aset statis
import { periksa, FORM_SAH } from './simpan.js';

const PEMUTAR = 'https://h5p.wello.web.id';
const HEADER = {
  'content-security-policy': `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-src ${PEMUTAR}; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`,
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': `fullscreen=(self "${PEMUTAR}"), camera=(), microphone=(), geolocation=()`,
  'x-robots-tag': 'noindex',
};

const pasang = (res, tambahan = {}) => {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries({ ...HEADER, ...tambahan })) r.headers.set(k, v);
  return r;
};
const json = (obj, status = 200) => pasang(new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } }), { 'cache-control': 'no-store' });
const catat = (kejadian, isi) => console.log(JSON.stringify({ kejadian, ...isi })); // tanpa isi jawaban / data pribadi

async function simpan(req, env) {
  const url = new URL(req.url);
  if (req.headers.get('origin') !== url.origin) { catat('simpan-ditolak', { alasan: 'origin', origin: req.headers.get('origin') }); return json({ ok: false }, 403); }
  if (!(req.headers.get('content-type') || '').startsWith('application/json')) return json({ ok: false }, 415);
  const hasil = periksa(await req.text());
  if (!hasil.ok) { catat('simpan-ditolak', { alasan: hasil.galat }); return json({ ok: false, galat: hasil.galat }, 400); }
  const b = hasil.baris;
  // Baris yang udah "selesai" atau milik form lain nggak bisa ditimpa.
  const r = await env.DB.prepare(
    `INSERT INTO jawaban (id, form, mulai, diubah, selesai, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(id) DO UPDATE SET diubah = excluded.diubah, selesai = excluded.selesai, data = excluded.data
     WHERE jawaban.selesai IS NULL AND jawaban.form = excluded.form`,
  ).bind(b.id, b.form, b.mulai, b.diubah, b.selesai, b.data).run();
  if (!r.meta.changes) { catat('simpan-ditolak', { alasan: 'terkunci', form: b.form }); return json({ ok: false, galat: 'terkunci' }, 409); }
  if (b.selesai) catat('jawaban-selesai', { form: b.form });
  return json({ ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/uji/api/simpan') return req.method === 'POST' ? await simpan(req, env) : json({ ok: false }, 405);
      if (req.method !== 'GET' && req.method !== 'HEAD') return json({ ok: false }, 405);
      const kode = url.pathname.match(/^\/uji\/([a-z0-9-]+)$/)?.[1];
      if (kode) {
        if (!FORM_SAH.includes(kode)) return pasang(new Response('Formulir tidak ditemukan. Minta link yang benar ke dosen atau peneliti.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
        return pasang(await env.ASSETS.fetch(new Request(new URL('/uji/index.html', url))), { 'cache-control': 'no-cache' });
      }
      return pasang(await env.ASSETS.fetch(req));
    } catch (e) {
      // Gagal = tutup: browser tetap nyimpen di localStorage dan nyoba lagi.
      catat('galat', { jalur: url.pathname, pesan: String(e?.message || e).slice(0, 200) });
      return json({ ok: false, galat: 'server' }, 500);
    }
  },
};
