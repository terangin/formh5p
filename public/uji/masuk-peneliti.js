// Masuk peneliti di halaman laporan: email -> kode 6 angka -> sesi (cookie HttpOnly dari server, lihat src/masuk.js).
const post = (url, isi) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(isi) });

async function saya() {
  const r = await fetch('/uji/api/saya');
  if (r.status === 401) return null;
  if (!r.ok) throw new Error('Server belum bisa dihubungi. Coba muat ulang halaman.');
  return r.json();
}

// Balik {email, forms} kalau sudah masuk; kalau belum, tampilkan form masuk dan tunggu sampai berhasil.
export async function pastikanMasuk($) {
  const ada = await saya();
  if (ada) return ada;
  const fe = $('form-email'), fk = $('form-kode');
  const galat = (t) => { $('galat-masuk').textContent = t; $('galat-masuk').hidden = !t; };
  $('masuk').hidden = false;
  fe.elements.email.focus();
  return new Promise((selesai) => {
    let email = '';
    const kirim = (form, kerja) => async (e) => {
      e.preventDefault();
      galat('');
      const b = form.querySelector('button[type=submit]');
      b.disabled = true;
      try { await kerja(); } catch { galat('Koneksi terputus. Coba lagi.'); } finally { b.disabled = false; }
    };
    fe.onsubmit = kirim(fe, async () => {
      email = fe.elements.email.value.trim();
      const r = await post('/uji/api/masuk/minta', { email });
      if (r.status === 400) return galat('Format email belum benar.');
      if (r.status === 429) return galat('Terlalu sering meminta kode. Tunggu 15 menit, lalu coba lagi.');
      if (!r.ok) return galat('Kode belum bisa dikirim. Coba lagi beberapa saat lagi.');
      fe.hidden = true;
      fk.hidden = false;
      $('info-kode').textContent = `Bila ${email} terdaftar sebagai peneliti, kode 6 angka sudah dikirim ke email tersebut. Periksa juga folder Spam. Kode berlaku 10 menit.`;
      fk.elements.kode.focus();
    });
    fk.onsubmit = kirim(fk, async () => {
      // Kode yang ditempel dari email kadang ikut spasi/strip ("123 456").
      const r = await post('/uji/api/masuk/cek', { email, kode: fk.elements.kode.value.replace(/\D/g, '') });
      if (r.status === 400) return galat('Kode terdiri dari 6 angka.');
      if (!r.ok) return galat('Kode salah atau sudah tidak berlaku. Setelah 5 kali salah, minta kode baru.');
      // Kode benar tapi cookie nggak kebawa (mis. browser memblokir cookie): jangan diam-diam rusak.
      const orang = await saya();
      if (!orang) return galat('Kode benar, tetapi browser tidak menyimpan sesi masuk. Izinkan cookie untuk situs ini, lalu coba lagi.');
      $('masuk').hidden = true;
      selesai(orang);
    });
    $('ganti-email').onclick = () => { fk.reset(); fk.hidden = true; fe.hidden = false; galat(''); fe.elements.email.focus(); };
  });
}

export async function keluarPeneliti() {
  await post('/uji/api/keluar', {}).catch(() => {});
  location.reload();
}
