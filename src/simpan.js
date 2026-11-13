// Validasi kiriman jawaban dari browser. Murni (tanpa D1) biar bisa dites di node.
export const FORM_SAH = ['ut-tp', 'ut-bindo-1', 'ut-bindo-2', 'ut-arab'];
export const MAKS_BYTE = 512 * 1024; // jejak posisi video 15 menit + xAPI jauh di bawah ini
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const WAKTU = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// Balik { ok: true, baris } atau { ok: false, galat }.
export function periksa(teks) {
  if (typeof teks !== 'string' || teks.length > MAKS_BYTE) return { ok: false, galat: 'kebesaran' };
  let d;
  try { d = JSON.parse(teks); } catch { return { ok: false, galat: 'bukan json' }; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false, galat: 'bukan objek' };
  if (!UUID.test(d.id || '')) return { ok: false, galat: 'id' };
  if (!FORM_SAH.includes(d.form)) return { ok: false, galat: 'form' };
  if (!WAKTU.test(d.mulai || '') || !WAKTU.test(d.diubah || '')) return { ok: false, galat: 'waktu' };
  if (d.selesai != null && !WAKTU.test(d.selesai)) return { ok: false, galat: 'selesai' };
  if (!d.persetujuan) return { ok: false, galat: 'belum setuju' }; // tanpa persetujuan nggak ada yang disimpan
  return { ok: true, baris: { id: d.id, form: d.form, mulai: d.mulai, diubah: d.diubah, selesai: d.selesai || null, data: teks } };
}
