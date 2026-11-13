// Form uji coba video pembelajaran UT (nyalain.kitaterangin.id/uji/<kode>).
// Video diputar pemutar Wello (h5p.wello.web.id/tonton) di iframe; protokol postMessage
// ada di kepala tonton.js repo h5p-player. Versi coba: semua data baru disimpan di localStorage.
const PEMUTAR = location.hostname === 'localhost' ? 'http://localhost:8093' : 'https://h5p.wello.web.id';

const FORM = {
  'ut-tp': {
    matkul: 'Produksi Bahan Pembelajaran Berbasis Online (SPTP4401)', prodi: 'Teknologi Pendidikan', periksa: 'Check', majuDikunci: true,
    video: [{ isi: 'tp1-8a082ca8', judul: 'Video 1', detik: 398 }, { isi: 'tp2-3a0b90ab', judul: 'Video 2', detik: 464 }],
  },
  'ut-bindo-1': {
    matkul: 'Bahasa Indonesia', prodi: 'Pendidikan Bahasa dan Sastra Indonesia', periksa: 'Periksa', majuDikunci: true,
    video: [{ isi: 'bi1-67b38ac4', judul: 'Ketika Perbedaan Menjadi Solusi', detik: 415 }],
  },
  'ut-bindo-2': {
    matkul: 'Bahasa Indonesia', prodi: 'Pendidikan Bahasa dan Sastra Indonesia', periksa: 'Periksa', majuDikunci: true,
    video: [{ isi: 'bi2-f51501ab', judul: 'Batik Bercerita: Sebuah Wawancara tentang Warisan Indonesia', detik: 452 }],
  },
  'ut-arab': {
    matkul: 'Bahasa Arab', prodi: '', periksa: 'Check', majuDikunci: false, tombolLompat: true,
    video: [{ isi: 'lumi-59763deb', judul: '[judul video belum dikasih]', detik: 927 }],
  },
};

// Instrumen dari docx peneliti. Butir 4 pernyataan negatif: skornya dibalik waktu dilaporkan, bukan di sini.
const BUTIR = [
  ['A. Kemenarikan', [
    'Warna, tata letak, dan gaya visual video terlihat rapi dan konsisten',
    'Setelah menonton, saya ingin mempelajari topik ini lebih lanjut',
    'Gambar dan animasi dalam video membantu saya memahami proses atau konsep tertentu',
    'Saya merasa bosan atau perhatian saya menurun pada bagian tertentu',
    'Gaya bahasa narator terasa seperti berbicara langsung kepada saya (komunikatif, tidak kaku)',
    'Suara narator terdengar alami dan enak didengar',
  ]],
  ['B. Kemudahan memahami materi', [
    'Materi dalam video mudah saya pahami',
    'Kecepatan penyampaian materi sesuai dengan kemampuan saya mengikuti',
    'Penjelasan narator jelas',
    'Urutan materi runtut, dari konsep dasar menuju konsep yang lebih lanjut',
    'Contoh yang diberikan membantu saya menerapkan konsep pada situasi lain',
    'Bahasa dan kalimat dalam narasi singkat dan mudah diikuti',
    'Teks di layar mudah dibaca (ukuran dan kontras) pada perangkat saya',
    'Penekanan visual (warna, sorotan, panah, huruf tebal) membantu saya menemukan poin terpenting',
    'Teks atau label muncul di dekat gambar yang dijelaskannya, sehingga saya tidak perlu mencari-cari',
    'Video terbagi dalam bagian-bagian yang jelas sehingga saya sempat mencerna materi sebelum lanjut',
  ]],
  ['C. Kemudahan penggunaan', [
    'Video mudah saya akses dari perangkat yang saya miliki',
    'Video berjalan tanpa terputus atau buffering selama saya menonton',
    'Durasi video sesuai dengan jumlah materi yang disampaikan',
    'Suara narasi terdengar jelas tanpa terganggu musik latar atau noise',
  ]],
  ['D. Manfaat', [
    'Video membantu saya belajar secara mandiri',
    'Setelah menonton, saya dapat menjelaskan kembali isi materi dengan kata-kata saya sendiri',
    'Video ini memperjelas bagian modul/BMP yang sebelumnya sulit saya pahami',
    'Saya dapat menerapkan isi video pada tugas kuliah atau pekerjaan saya',
    'Saya ingin video dengan gaya penyajian seperti ini tersedia pada mata kuliah lain',
  ]],
];

// Daftar resmi dari ut.ac.id/program-studi dan ut.ac.id/ut-daerah (dicek 13 Nov 2026). Pilihan tetap,
// tanpa isian bebas, biar data nggak perlu dibersihin. Mata Kuliah Umum, PPG, dan prodi SV yang baru buka 2027 nggak dimasukin.
const PRODI = [
  ['FKIP', ['Pendidikan Bahasa dan Sastra Indonesia', 'Pendidikan Bahasa Inggris', 'Pendidikan Biologi', 'Pendidikan Fisika', 'Pendidikan Kimia',
    'Pendidikan Matematika', 'Pendidikan Ekonomi', 'Pendidikan Pancasila dan Kewarganegaraan', 'Teknologi Pendidikan',
    'Pendidikan Guru Sekolah Dasar (PGSD)', 'Pendidikan Guru Pendidikan Anak Usia Dini (PGPAUD)', 'Pendidikan Agama Islam (PAI)']],
  ['FEB', ['Manajemen', 'Ekonomi Pembangunan', 'Ekonomi Syariah', 'Akuntansi', 'Akuntansi Keuangan Publik', 'Pariwisata', 'Kewirausahaan']],
  ['FHISIP', ['Ilmu Administrasi Publik', 'Administrasi Bisnis', 'Hukum', 'Ilmu Pemerintahan', 'Ilmu Komunikasi',
    'Perpustakaan dan Sains Informasi', 'Sosiologi', 'Sastra Inggris', 'Perpajakan']],
  ['FST', ['Statistika', 'Matematika', 'Biologi', 'Teknologi Pangan', 'Agribisnis', 'Perencanaan Wilayah dan Kota', 'Sistem Informasi', 'Sains Data']],
  ['Sekolah Vokasi', ['D3 Perpajakan', 'D4 Kearsipan']],
];
const UPBJJ = ['Banda Aceh', 'Medan', 'Batam', 'Padang', 'Pangkalpinang', 'Pekanbaru', 'Jambi', 'Palembang', 'Bengkulu', 'Bandar Lampung',
  'Jakarta', 'Jakarta 2', 'Serang', 'Bogor', 'Bandung', 'Purwokerto', 'Semarang', 'Surakarta', 'Yogyakarta', 'Surabaya', 'Malang', 'Jember',
  'Denpasar', 'Mataram', 'Kupang', 'Pontianak', 'Palangka Raya', 'Banjarmasin', 'Samarinda', 'Makassar', 'Majene', 'Palu', 'Kendari',
  'Manado', 'Gorontalo', 'Ambon', 'Ternate', 'Jayapura', 'Sorong', 'Tarakan', 'Luar Negeri'];

const LANGKAH = ['persetujuan', 'identitas', 'video', 'angket', 'catatan'];
const NAMA_LANGKAH = ['Persetujuan', 'Identitas', 'Tonton', 'Angket', 'Catatan'];
const SKALA = ['Sangat tidak setuju', 'Tidak setuju', 'Ragu-ragu', 'Setuju', 'Sangat setuju'];
const $ = (id) => document.getElementById(id);
const el = (tag, attr = {}, ...anak) => {
  const e = Object.assign(document.createElement(tag), attr);
  e.append(...anak);
  return e;
};
const mmdd = (d) => `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(Math.floor(d % 60)).padStart(2, '0')}`;

const kode = location.pathname.match(/^\/uji\/([a-z0-9-]+)$/)?.[1] || new URLSearchParams(location.search).get('f');
const form = FORM[kode];
const KUNCI = `uji:${kode}`;
let s;

function perangkat() {
  const c = navigator.connection;
  return {
    ua: navigator.userAgent, bahasa: navigator.language, zona: Intl.DateTimeFormat().resolvedOptions().timeZone,
    layar: `${screen.width}x${screen.height}`, jendela: `${innerWidth}x${innerHeight}`, rasioPiksel: devicePixelRatio,
    sentuh: navigator.maxTouchPoints > 0, koneksi: c ? { jenis: c.effectiveType, mbps: c.downlink, hemat: c.saveData } : null,
  };
}

function muat() {
  try { s = JSON.parse(localStorage.getItem(KUNCI)); } catch { s = null; }
  if (s?.versi === 1) return;
  s = {
    versi: 1, id: crypto.randomUUID(), form: kode, mulai: new Date().toISOString(), langkah: 'persetujuan',
    waktuLangkah: {}, persetujuan: null, identitas: {}, butir: {}, catatan: '', tanda: [], lewatiVideo: false,
    video: Object.fromEntries(form.video.map((v) => [v.isi, { durasi: null, selesai: 0, xapi: [], posisi: [], gagal: null }])),
    perangkat: perangkat(), selesai: null,
  };
}
// Tiap perubahan masuk localStorage dulu (aman kalau internet putus). Baris di server dibikin sekali
// waktu persetujuan, dijaga Turnstile (daftar). Setelah itu perubahan dikirim paling sering tiap 3 detik.
const LOKAL = location.hostname === 'localhost' && location.port === '5500'; // dev-server.mjs, tanpa API
// Sitekey publik widget "Form uji coba UT (formh5p)" (akun Terangin). Di wrangler dev pakai kunci tes Cloudflare yang selalu lolos.
const SITEKEY = location.hostname === 'nyalain.kitaterangin.id' ? '0x4AAAAAAF_sduyu4pBaXMQZ' : '1x00000000000000000000AA';
let jamKirim;
const simpan = () => {
  s.diubah = new Date().toISOString();
  localStorage.setItem(KUNCI, JSON.stringify(s));
  if (s.terdaftar && !s.selesai) { clearTimeout(jamKirim); jamKirim = setTimeout(keServer, 3000); }
};
async function keServer(token) {
  clearTimeout(jamKirim);
  if (LOKAL) return true;
  try {
    const headers = { 'content-type': 'application/json' };
    if (token) headers['cf-turnstile-response'] = token;
    const r = await fetch('/uji/api/simpan', { method: 'POST', headers, body: JSON.stringify(s), keepalive: true });
    return r.ok || r.status === 409; // 409 = udah terkunci karena pernah terkirim lengkap
  } catch { return false; }
}
addEventListener('pagehide', () => { if (s?.terdaftar && !s.selesai) keServer(); });

// Turnstile cuma di langkah persetujuan. Token sekali pakai: gagal = reset widget, minta token baru.
let tokenTurnstile = null, idWidget;
function pasangTurnstile(siap) {
  if (s.terdaftar || LOKAL) return;
  const skrip = el('script', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true });
  skrip.onload = () => {
    idWidget = window.turnstile.render('#turnstile', {
      sitekey: SITEKEY, action: 'mulai-uji', language: 'id',
      callback: (t) => { tokenTurnstile = t; siap(); },
      'expired-callback': () => { tokenTurnstile = null; siap(); },
      'error-callback': () => { tokenTurnstile = null; siap(); },
    });
  };
  document.head.append(skrip);
}

function ke(langkah) {
  s.langkah = langkah;
  s.waktuLangkah[langkah] ??= new Date().toISOString();
  simpan();
  for (const sec of document.querySelectorAll('[data-langkah]')) sec.hidden = sec.dataset.langkah !== langkah;
  const i = LANGKAH.indexOf(langkah);
  [...$('langkah').children].forEach((li, j) => {
    li.className = j < i || langkah === 'selesai' ? 'lewat' : j === i ? 'kini' : '';
    if (j === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('langkah-ke').textContent = i >= 0 ? `Langkah ${i + 1} dari ${LANGKAH.length}` : 'Selesai';
  if (langkah === 'angket') hitungButir();
  if (langkah === 'video') pasangVideo();
  if (langkah === 'catatan') gambarTanda();
  scrollTo(0, 0);
  document.querySelector(`[data-langkah="${langkah}"] h2`)?.focus?.();
}

// ---------- persetujuan ----------
function isiPersetujuan() {
  const nVideo = form.video.length > 1 ? `${form.video.length} video` : '1 video';
  // Perkiraan: lama video + sekitar 15 menit isi identitas dan angket, dibulatkan ke 5 menit.
  const menit = Math.ceil((form.video.reduce((a, v) => a + v.detik, 0) / 60 + 15) / 5) * 5;
  $('teks-persetujuan').innerHTML = `
    <p class="pengantar">Tim peneliti FKIP Universitas Terbuka sedang menguji video pembelajaran mata kuliah <b></b> sebelum dipakai lebih luas. Ringkasnya:</p>
    <ul class="poin">
      <li><b>Sekitar ${menit} menit</b><span>termasuk menonton ${nVideo}</span></li>
      <li><b>Sukarela</b><span>boleh berhenti kapan saja</span></li>
      <li><b>Tidak memengaruhi nilai</b><span>tidak ada jawaban benar atau salah</span></li>
      <li><b>Hanya untuk peneliti</b><span>hasil dilaporkan tanpa nama</span></li>
    </ul>
    <h3>Yang Anda lakukan</h3>
    <ol class="alur">
      <li>Isi identitas</li>
      <li>Tonton ${nVideo} sampai selesai</li>
      <li>Isi 25 pernyataan</li>
      <li>Tulis catatan, boleh dikosongkan</li>
    </ol>
    <p class="kecil">Bila bersedia, Anda bisa dihubungi untuk wawancara lanjutan.</p>
    <details class="rincian">
      <summary>Rincian data yang dicatat dan cara penyimpanannya</summary>
      <h4>Data yang dicatat</h4>
      <ul>
        <li>Isian Anda: identitas (termasuk email, dan nomor WhatsApp bila Anda bersedia diwawancara), jawaban angket, catatan, dan menit yang Anda tandai.</li>
        <li>Selama menonton: bagian video yang diputar, diulang, atau dilewati, dan jawaban kuis di dalam video.</li>
        <li>Perangkat: jenis browser, ukuran layar, zona waktu, dan perkiraan kecepatan internet.</li>
      </ul>
      <h4>Siapa yang melihat dan berapa lama disimpan</h4>
      <p>Data hanya bisa dilihat tim peneliti. Email dan nomor WhatsApp hanya dipakai peneliti untuk menghubungi Anda terkait penelitian ini. Data disimpan di server Cloudflare dan dihapus setelah penelitian selesai, paling lambat [tanggal belum ditentukan].</p>
      <p>Formulir ini disediakan Nyalain (dari Terangin). Nyalain tidak memakai data Anda untuk keperluan lain dan tidak mengirimi Anda promosi.</p>
    </details>
    <p class="kecil">Ada pertanyaan? Hubungi peneliti: [nama dan kontak peneliti belum dikasih].</p>`;
  $('teks-persetujuan').querySelector('b').textContent = form.matkul;
  const tombol = $('lanjut-persetujuan');
  const atur = () => { tombol.disabled = !s.persetujuan || !(s.terdaftar || LOKAL || tokenTurnstile); };
  $('setuju').checked = !!s.persetujuan;
  $('setuju').onchange = (e) => {
    s.persetujuan = e.target.checked ? new Date().toISOString() : null;
    atur();
    simpan();
  };
  pasangTurnstile(atur);
  atur();
  tombol.onclick = async () => {
    if (s.terdaftar || LOKAL) return ke('identitas');
    tombol.disabled = true;
    tombol.textContent = 'Memeriksa...';
    const ok = await keServer(tokenTurnstile);
    tokenTurnstile = null;
    tombol.textContent = 'Lanjut';
    if (ok) {
      s.terdaftar = new Date().toISOString();
      $('galat-persetujuan').hidden = true;
      $('turnstile').hidden = true;
      return ke('identitas');
    }
    $('galat-persetujuan').hidden = false;
    window.turnstile?.reset(idWidget);
    atur();
  };
  $('tolak').onclick = () => { localStorage.removeItem(KUNCI); for (const sec of document.querySelectorAll('[data-langkah]')) sec.hidden = sec.dataset.langkah !== 'tolak'; };
}

// ---------- identitas ----------
function isiIdentitas() {
  const f = $('form-identitas');
  // Kotak ketik + saran (datalist). Isian tetap harus sama dengan salah satu pilihan resmi (dicek waktu Lanjut).
  $('daftar-prodi').append(...PRODI.flatMap(([fak, daftar]) => daftar.map((p) => el('option', { value: p, label: fak }))));
  $('daftar-upbjj').append(...UPBJJ.map((u) => el('option', { value: u })));
  const resmi = { prodi: PRODI.flatMap(([, d]) => d), upbjj: UPBJJ };
  // Ketikan yang cuma beda huruf besar/kecil dirapikan ke nama resmi.
  for (const n of Object.keys(resmi)) {
    f.elements[n].addEventListener('change', (e) => {
      const cocok = resmi[n].find((x) => x.toLowerCase() === e.target.value.trim().toLowerCase());
      if (cocok && cocok !== e.target.value) { e.target.value = cocok; s.identitas[n] = cocok; simpan(); }
    });
  }
  if (!s.identitas.tanggal) s.identitas.tanggal = new Date().toLocaleDateString('sv-SE');
  if (!s.identitas.prodi && form.prodi) s.identitas.prodi = form.prodi;
  for (const [k, v] of Object.entries(s.identitas)) {
    const x = f.elements[k];
    if (x?.type === 'checkbox') x.checked = !!v; else if (x) x.value = v;
  }
  const lainnya = () => {
    for (const lab of f.querySelectorAll('[data-lainnya]')) {
      lab.hidden = f.elements[lab.dataset.lainnya].value !== 'lainnya';
      lab.querySelector('input').required = !lab.hidden;
    }
    // WhatsApp cuma diminta dari yang bersedia diwawancara.
    $('kolom-wa').hidden = !f.elements.bersedia_wawancara.checked;
    f.elements.whatsapp.required = f.elements.bersedia_wawancara.checked;
  };
  lainnya();
  f.oninput = (e) => {
    s.identitas[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim();
    e.target.removeAttribute('aria-invalid');
    lainnya();
    simpan();
  };
  f.onsubmit = (e) => {
    e.preventDefault();
    // Format yang dicek selain wajib isi. Pesan pertama yang kena dipakai.
    const FORMAT = {
      nim: [/^\d{6,12}$/, 'NIM diisi angka saja.'],
      prodi: [{ test: (v) => resmi.prodi.includes(v) }, 'Program studi harus dipilih dari daftar yang muncul saat mengetik.'],
      upbjj: [{ test: (v) => resmi.upbjj.includes(v) }, 'UPBJJ harus dipilih dari daftar yang muncul saat mengetik.'],
      email: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Alamat email belum benar.'],
      whatsapp: [/^(\+?62|0)8\d{7,12}$/, 'Nomor WhatsApp belum benar, contoh 081234567890.'],
    };
    const bersih = (x) => (x.name === 'whatsapp' ? x.value.replace(/[\s-]/g, '') : x.value.trim());
    const pesan = [];
    const salah = [...f.elements].filter((x) => {
      if (!x.name || x.type === 'checkbox' || x.closest('[hidden]')) return false;
      if (x.required && !bersih(x)) return true;
      const aturan = FORMAT[x.name];
      if (aturan && bersih(x) && !aturan[0].test(bersih(x))) { pesan.push(aturan[1]); return true; }
      return false;
    });
    salah.forEach((x) => x.setAttribute('aria-invalid', 'true'));
    $('galat-identitas').hidden = !salah.length;
    if (salah.length) {
      $('galat-identitas').textContent = pesan[0] ? `${pesan[0]} Cek juga kotak yang bergaris merah.` : 'Masih ada yang kosong, lihat kotak yang bergaris merah.';
      salah[0].focus();
      return;
    }
    // Nomor dari yang nggak bersedia diwawancara nggak disimpan.
    if (f.elements.bersedia_wawancara.checked) s.identitas.whatsapp = bersih(f.elements.whatsapp);
    else delete s.identitas.whatsapp;
    ke('video');
  };
}

// ---------- video ----------
const bingkai = new Map(); // window iframe -> isi
let tanyaId = 0, jamPosisi;
const tunggu = new Map(); // id minta-waktu -> fungsi

function pasangVideo() {
  if (bingkai.size) return;
  const wadah = $('daftar-video');
  for (const v of form.video) {
    const iframe = el('iframe', { src: `${PEMUTAR}/tonton?isi=${v.isi}`, title: `Pemutar ${v.judul}`, allow: 'fullscreen', loading: 'eager' });
    const status = el('span', { className: 'status-video', id: `status-${v.isi}` });
    const urut = form.video.length > 1 ? el('span', { className: 'urut', textContent: `Video ${form.video.indexOf(v) + 1} dari ${form.video.length}` }) : '';
    const tandai = el('button', { type: 'button', className: 'tombol-dua', textContent: 'Tandai menit ini' });
    tandai.onclick = async () => {
      const detik = await mintaWaktu(iframe.contentWindow);
      if (detik == null) return;
      const t = { video: v.isi, detik: Math.round(detik), catatan: '', dibuat: new Date().toISOString(), dari: 'tombol' };
      s.tanda.push(t);
      simpan();
      gambarTandaVideo(v.isi);
      $(`catatan-${t.dibuat}`)?.focus(); // langsung nulis selagi ingat
    };
    wadah.append(el('div', { className: 'video' }, el('div', { className: 'video-kepala' }, el('div', {}, urut, el('h3', { textContent: v.judul })), status), iframe,
      el('div', { className: 'video-bawah' }, el('span', { className: 'kecil', textContent: 'Ada bagian yang keliru atau membingungkan? Tekan saat bagian itu muncul, lalu tulis catatannya (jeda videonya dulu kalau perlu).' }), tandai),
      el('ol', { className: 'daftar-tanda', id: `tanda-${v.isi}` })));
    gambarTandaVideo(v.isi);
    bingkai.set(iframe.contentWindow, v.isi);
  }
  perbaruiStatus();
  // Catat posisi tiap 5 detik selama halaman kelihatan: dari sini ketahuan bagian yang diulang/dilewati.
  jamPosisi = setInterval(async () => {
    if (document.hidden || s.langkah !== 'video') return;
    for (const [w, isi] of bingkai) {
      const d = await mintaWaktu(w);
      const p = s.video[isi].posisi;
      if (d != null && (!p.length || Math.abs(p[p.length - 1][1] - d) > 0.5)) p.push([Date.now() - Date.parse(s.mulai), Math.round(d * 10) / 10]);
    }
    simpan();
  }, 5000);
}

function mintaWaktu(w) {
  return new Promise((jadi) => {
    const id = ++tanyaId;
    tunggu.set(id, jadi);
    w.postMessage({ jenis: 'minta-waktu', id }, PEMUTAR);
    setTimeout(() => { if (tunggu.delete(id)) jadi(null); }, 1500);
  });
}

addEventListener('message', (e) => {
  if (e.origin !== PEMUTAR || e.data?.sumber !== 'wello-h5p') return;
  const isi = bingkai.get(e.source);
  if (!isi) return;
  const d = e.data, v = s.video[isi];
  const ts = Date.now() - Date.parse(s.mulai);
  if (d.jenis === 'waktu') { tunggu.get(d.id)?.(d.detik); tunggu.delete(d.id); return; }
  if (d.jenis === 'tinggi') {
    const f = [...document.querySelectorAll('.video iframe')].find((x) => x.contentWindow === e.source);
    if (f && d.px > 150) f.style.height = `${Math.min(d.px, 1400)}px`;
    return;
  }
  if (d.jenis === 'siap') v.durasi = d.durasi;
  if (d.jenis === 'xapi') v.xapi.push({ ts, kata: d.kata, detik: d.detik, skor: d.skor, jawaban: d.jawaban, soal: d.soal });
  if (d.jenis === 'selesai') v.selesai++;
  if (d.jenis === 'gagal') v.gagal = d.pesan;
  simpan();
  perbaruiStatus();
});

const semuaSelesai = () => form.video.every((v) => s.video[v.isi].selesai > 0);
function perbaruiStatus() {
  for (const v of form.video) {
    const st = $(`status-${v.isi}`), x = s.video[v.isi];
    if (!st) continue;
    st.textContent = x.gagal ? 'Gagal dimuat' : x.selesai ? 'Sudah ditonton' : 'Belum selesai';
    st.classList.toggle('beres', !!x.selesai);
    st.classList.toggle('gagal', !!x.gagal);
  }
  if (semuaSelesai()) $('galat-video').hidden = true;
}

function isiCara() {
  const b = (t) => el('b', { textContent: t });
  const li = (...isi) => el('li', {}, ...isi);
  $('cara-video').replaceChildren(
    li('Tekan tombol putar di tengah video. Untuk layar penuh, tekan ikon kotak di pojok kanan bawah video.'),
    li('Di beberapa bagian, video berhenti sendiri dan muncul soal. Mohon jawab soalnya, tekan ', b(form.periksa), ', lalu tekan tombol putar untuk melanjutkan.'),
    li('Nilai soal di dalam video tidak dipakai untuk nilai mata kuliah. Jawaban Anda dicatat untuk menilai videonya, bukan menilai Anda.'),
    form.majuDikunci
      ? li('Video tidak bisa dilompati ke depan. Anda tetap bisa mundur untuk mengulang bagian tertentu, dan bisa menjeda kapan saja.')
      : li('Video bisa dijeda, dimundurkan, atau dimajukan kapan saja.'),
    ...(form.tombolLompat ? [li('Ada tombol dan kotak teks di dalam video. Tekan untuk melompat ke bagian tertentu atau membaca penjelasan.')] : []),
    li(form.video.length > 1 ? 'Kedua video harus ditonton sampai selesai sebelum lanjut ke angket.' : 'Video harus ditonton sampai selesai sebelum lanjut ke angket.'),
  );
}

function isiVideo() {
  isiCara();
  $('lanjut-video').onclick = () => {
    if (semuaSelesai() || s.lewatiVideo) return ke('angket');
    $('galat-video').textContent = form.video.length > 1 ? 'Tonton kedua video sampai habis dulu.' : 'Tonton video sampai habis dulu.';
    $('galat-video').hidden = false;
    $('lewati-video').hidden = false;
  };
  $('lewati-video').onclick = () => { s.lewatiVideo = new Date().toISOString(); ke('angket'); };
}

// ---------- angket ----------
function isiAngket() {
  let no = 0;
  for (const [aspek, daftar] of BUTIR) {
    const fs = el('fieldset', { className: 'aspek' }, el('legend', { textContent: aspek }));
    for (const teks of daftar) {
      const n = ++no;
      const grup = el('div', { className: 'pilihan-skala', role: 'radiogroup', ariaLabel: `Butir ${n}: ${teks}` });
      for (let k = 1; k <= 5; k++) {
        const r = el('input', { type: 'radio', name: `b${n}`, value: k, checked: s.butir[n] === k, ariaLabel: `${k}, ${SKALA[k - 1]}` });
        r.onchange = () => { s.butir[n] = k; kotak.classList.remove('kurang'); kotak.classList.add('dijawab'); simpan(); hitungButir(); };
        grup.append(el('label', { className: `nilai-${k}` }, r, el('span', { ariaHidden: 'true' }, el('b', { textContent: k }), el('small', { textContent: SKALA[k - 1] }))));
      }
      const kotak = el('div', { className: `butir${s.butir[n] ? ' dijawab' : ''}`, id: `butir-${n}` }, el('p', {}, el('b', { className: 'no', textContent: n }), el('span', { textContent: teks })), grup);
      fs.append(kotak);
    }
    $('daftar-butir').append(fs);
  }
  $('lanjut-angket').onclick = () => {
    const kosong = [];
    for (let n = 1; n <= no; n++) if (!s.butir[n]) kosong.push(n);
    for (const n of kosong) $(`butir-${n}`).classList.add('kurang');
    $('galat-angket').hidden = !kosong.length;
    if (!kosong.length) return ke('catatan');
    $('galat-angket').textContent = `Butir ${kosong.join(', ')} belum dijawab.`;
    $(`butir-${kosong[0]}`).scrollIntoView({ block: 'center' });
    $(`butir-${kosong[0]}`).querySelector('input').focus({ preventScroll: true });
  };
}

function hitungButir() {
  const n = Object.keys(s.butir).length, total = BUTIR.reduce((a, [, d]) => a + d.length, 0);
  $('hitung-butir').textContent = n === total ? 'Semua butir sudah dijawab' : `${n} dari ${total} butir sudah dijawab`;
}

// ---------- catatan + tanda ----------
const judulVideo = (isi) => form.video.find((v) => v.isi === isi)?.judul || isi;
// Satu baris tanda: menit + kotak catatan + hapus. Dipakai di bawah video (waktu nonton) dan di langkah Catatan (cek ulang).
function barisTanda(t, gambarUlang, tampilAsal) {
  const catatan = el('input', { id: `catatan-${t.dibuat}`, value: t.catatan, placeholder: 'Apa yang keliru atau membingungkan?', ariaLabel: `Catatan untuk menit ${mmdd(t.detik)}` });
  catatan.oninput = () => { t.catatan = catatan.value; simpan(); };
  const hapus = el('button', { type: 'button', className: 'tombol-teks', textContent: 'Hapus' });
  hapus.onclick = () => { s.tanda.splice(s.tanda.indexOf(t), 1); simpan(); gambarUlang(); };
  return el('li', {}, el('span', { className: 'waktu', textContent: mmdd(t.detik) }), catatan, hapus,
    ...(tampilAsal ? [el('span', { className: 'asal', textContent: judulVideo(t.video) })] : []));
}
const urutTanda = () => s.tanda.sort((a, b) => a.video.localeCompare(b.video) || a.detik - b.detik);
function gambarTandaVideo(isi) {
  $(`tanda-${isi}`)?.replaceChildren(...urutTanda().filter((t) => t.video === isi).map((t) => barisTanda(t, () => gambarTandaVideo(isi), false)));
}
function gambarTanda() {
  $('kosong-tanda').hidden = s.tanda.length > 0;
  $('daftar-tanda').replaceChildren(...urutTanda().map((t) => barisTanda(t, gambarTanda, form.video.length > 1)));
}

function isiCatatan() {
  $('catatan').value = s.catatan;
  $('catatan').oninput = (e) => { s.catatan = e.target.value; simpan(); };
  const pilih = $('pilih-video-tanda');
  for (const v of form.video) pilih.append(el('option', { value: v.isi, textContent: v.judul }));
  pilih.closest('label').hidden = form.video.length < 2;
  $('form-tanda').onsubmit = (e) => {
    e.preventDefault();
    const m = e.target.elements.menit.value.match(/^(\d{1,3}):([0-5]\d)$/);
    if (!m) return e.target.elements.menit.setAttribute('aria-invalid', 'true');
    s.tanda.push({ video: pilih.value, detik: +m[1] * 60 + +m[2], catatan: '', dibuat: new Date().toISOString(), dari: 'ketik' });
    e.target.reset();
    simpan();
    gambarTanda();
  };
  $('kirim').onclick = async () => {
    const tombol = $('kirim');
    tombol.disabled = true;
    tombol.textContent = 'Mengirim...';
    s.selesai = new Date().toISOString();
    simpan();
    if (await keServer()) {
      clearInterval(jamPosisi);
      return ke('selesai');
    }
    s.selesai = null; // belum sampai server: jangan dikunci, biar bisa dicoba lagi
    simpan();
    tombol.disabled = false;
    tombol.textContent = 'Kirim jawaban';
    $('galat-kirim').hidden = false;
  };
}

// ---------- mode dev (cuma localhost:5500, nggak pernah ada di situs asli) ----------
// Loncat ke langkah mana aja tanpa syarat (nggak perlu nonton habis / ngisi semua), plus reset.
function pasangBilahDev() {
  const bilah = el('div', { className: 'bilah-dev' }, el('b', { textContent: 'Mode dev' }));
  for (const l of [...LANGKAH, 'selesai']) {
    const t = el('button', { type: 'button', textContent: l });
    t.onclick = () => ke(l);
    bilah.append(t);
  }
  const reset = el('button', { type: 'button', textContent: 'reset' });
  reset.onclick = () => { localStorage.removeItem(KUNCI); location.reload(); };
  const ganti = el('select', { ariaLabel: 'Ganti form' }, ...Object.keys(FORM).map((k) => el('option', { value: k, textContent: k, selected: k === kode })));
  ganti.onchange = () => { location.href = `/uji/${ganti.value}`; };
  bilah.append(reset, ganti);
  document.body.append(bilah);
}

// ---------- mulai ----------
if (!form) {
  $('galat-form').textContent = 'Alamat formulir ini tidak lengkap. Minta link yang benar ke dosen atau peneliti.';
  $('galat-form').hidden = false;
} else {
  muat();
  $('kepala').hidden = false;
  $('judul-form').textContent = form.matkul;
  $('sub-form').textContent = form.video.length > 1 ? `${form.video.length} video, satu angket` : form.video[0].judul;
  $('langkah').append(...NAMA_LANGKAH.map((t) => el('li', {}, el('span', { textContent: t }))));
  isiPersetujuan(); isiIdentitas(); isiVideo(); isiAngket(); isiCatatan();
  $('versi-coba').hidden = !LOKAL;
  if (LOKAL) pasangBilahDev();
  ke(s.selesai ? 'selesai' : s.langkah);
}
