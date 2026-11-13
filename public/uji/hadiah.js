// Tanda terima kasih (saldo dompet digital), opsional, di langkah Catatan sebelum Kirim.
// Kalimatnya sengaja tidak menjanjikan semua responden dapat (bisa diundi): ketentuannya dari peneliti.
// Data: s.hadiah = { mau, dompet, nomor, nama }. Nomor cuma disimpan kalau `mau` dicentang.
export const DOMPET = ['GoPay', 'OVO', 'DANA', 'ShopeePay'];
const POLA_NOMOR = /^(\+?62|0)8\d{7,12}$/;
const bersih = (v) => String(v || '').replace(/[\s-]/g, '');

export function pasangHadiah({ s, simpan, $ }) {
  const f = $('form-hadiah');
  s.hadiah ??= { mau: false };
  const h = s.hadiah;
  f.elements.dompet.append(...DOMPET.map((d) => Object.assign(document.createElement('option'), { value: d, textContent: d })));
  f.elements.mau.checked = !!h.mau;
  for (const k of ['dompet', 'nomor', 'nama']) if (h[k]) f.elements[k].value = h[k];

  const atur = () => {
    $('isian-hadiah').hidden = !f.elements.mau.checked;
    // "Sama dengan WhatsApp" cuma ditawarkan kalau responden memang mengisi WhatsApp.
    $('pakai-wa').closest('label').hidden = !s.identitas?.whatsapp;
  };
  atur();
  f.oninput = (e) => {
    const x = e.target;
    x.removeAttribute('aria-invalid');
    $('galat-hadiah').hidden = true;
    if (x.name === 'mau') h.mau = x.checked;
    else if (x.id === 'pakai-wa') { if (x.checked) { f.elements.nomor.value = s.identitas.whatsapp; h.nomor = s.identitas.whatsapp; } }
    else if (x.name) h[x.name] = x.name === 'nomor' ? bersih(x.value) : x.value.trim();
    if (!h.mau) { delete h.dompet; delete h.nomor; delete h.nama; } // jangan simpan nomor dari yang nggak mau
    atur();
    simpan();
  };
  f.onsubmit = (e) => e.preventDefault();
}

// Dipanggil sebelum Kirim. Balik pesan galat (string) atau null kalau aman.
export function periksaHadiah({ s, $ }) {
  const f = $('form-hadiah');
  if (!s.hadiah?.mau) return null;
  const salah = [];
  if (!DOMPET.includes(s.hadiah.dompet)) salah.push(f.elements.dompet);
  if (!POLA_NOMOR.test(bersih(s.hadiah.nomor))) salah.push(f.elements.nomor);
  if (!s.hadiah.nama) salah.push(f.elements.nama);
  salah.forEach((x) => x.setAttribute('aria-invalid', 'true'));
  if (!salah.length) return null;
  salah[0].focus();
  return 'Lengkapi isian tanda terima kasih (jenis dompet digital, nomor, dan nama pemilik akun), atau hapus centangnya bila tidak ingin.';
}
