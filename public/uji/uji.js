// Form uji coba video pembelajaran UT (nyalain.kitaterangin.id/uji/<kode>).
// Video diputar pemutar Wello (h5p.wello.web.id/tonton) di iframe; protokol postMessage
// ada di kepala tonton.js repo h5p-player. Versi coba: semua data baru disimpan di localStorage.
const PEMUTAR = location.hostname === 'localhost' ? 'http://localhost:8093' : 'https://h5p.wello.web.id';

const FORM = {
  'ut-tp': {
    matkul: 'Produksi Bahan Pembelajaran Berbasis Online (SPTP4401)', prodi: 'Teknologi Pendidikan',
    video: [{ isi: 'tp1-8a082ca8', judul: 'Video 1' }, { isi: 'tp2-3a0b90ab', judul: 'Video 2' }],
  },
  'ut-bindo-1': {
    matkul: 'Bahasa Indonesia', prodi: 'Pendidikan Bahasa Indonesia',
    video: [{ isi: 'bi1-67b38ac4', judul: 'Ketika Perbedaan Menjadi Solusi' }],
  },
  'ut-bindo-2': {
    matkul: 'Bahasa Indonesia', prodi: 'Pendidikan Bahasa Indonesia',
    video: [{ isi: 'bi2-f51501ab', judul: 'Batik Bercerita: Sebuah Wawancara tentang Warisan Indonesia' }],
  },
  'ut-arab': {
    matkul: 'Bahasa Arab', prodi: '',
    video: [{ isi: 'lumi-59763deb', judul: '[judul video belum dikasih]' }],
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
// Tiap perubahan masuk localStorage dulu (aman kalau internet putus), lalu dikirim ke server
// paling sering tiap 3 detik. Sebelum ada persetujuan nggak ada yang dikirim.
const LOKAL = location.hostname === 'localhost' && location.port === '5500'; // dev-server.mjs, tanpa API
let jamKirim;
const simpan = () => {
  s.diubah = new Date().toISOString();
  localStorage.setItem(KUNCI, JSON.stringify(s));
  if (s.persetujuan && !s.selesai) { clearTimeout(jamKirim); jamKirim = setTimeout(keServer, 3000); }
};
async function keServer() {
  clearTimeout(jamKirim);
  if (LOKAL) return true;
  try {
    const r = await fetch('/uji/api/simpan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s), keepalive: true });
    return r.ok || r.status === 409; // 409 = udah terkunci karena pernah terkirim lengkap
  } catch { return false; }
}
addEventListener('pagehide', () => { if (s?.persetujuan && !s.selesai) keServer(); });

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
  const menit = form.video.length > 1 ? `${form.video.length} video` : '1 video';
  $('teks-persetujuan').innerHTML = `
    <h3>Tujuan</h3>
    <p>Tim peneliti Fakultas Keguruan dan Ilmu Pendidikan Universitas Terbuka sedang menguji video pembelajaran mata kuliah <b></b>. Uji coba ini mencari kesalahan, bagian yang membingungkan, dan kendala teknis sebelum video dipakai lebih luas.</p>
    <h3>Yang Anda lakukan</h3>
    <p>Mengisi identitas, menonton ${menit} sampai selesai, mengisi 25 pernyataan, dan menulis catatan bila ada. Anda mungkin dihubungi untuk wawancara lanjutan.</p>
    <h3>Sukarela</h3>
    <p>Keikutsertaan Anda sukarela. Anda boleh berhenti kapan saja. Ikut atau tidak, jawaban Anda tidak memengaruhi nilai mata kuliah.</p>
    <h3>Data yang dicatat</h3>
    <ul>
      <li>Isian Anda: identitas, jawaban angket, catatan, dan menit yang Anda tandai.</li>
      <li>Selama menonton: bagian video yang diputar, diulang, atau dilewati, dan jawaban kuis di dalam video.</li>
      <li>Perangkat: jenis browser, ukuran layar, zona waktu, dan perkiraan kecepatan internet.</li>
    </ul>
    <h3>Siapa yang melihat dan berapa lama disimpan</h3>
    <p>Data hanya bisa dilihat tim peneliti. Hasil penelitian dilaporkan tanpa menyebut nama. Data disimpan di server Cloudflare dan dihapus setelah penelitian selesai, paling lambat [tanggal belum ditentukan].</p>
    <p>Formulir ini disediakan Nyalain (dari Terangin). Nyalain tidak memakai data Anda untuk keperluan lain dan tidak mengirimi Anda promosi.</p>
    <h3>Pertanyaan</h3>
    <p>Hubungi peneliti: [nama dan kontak peneliti belum dikasih].</p>`;
  $('teks-persetujuan').querySelector('b').textContent = form.matkul;
  $('setuju').checked = !!s.persetujuan;
  $('lanjut-persetujuan').disabled = !s.persetujuan;
  $('setuju').onchange = (e) => {
    s.persetujuan = e.target.checked ? new Date().toISOString() : null;
    $('lanjut-persetujuan').disabled = !e.target.checked;
    simpan();
  };
  $('lanjut-persetujuan').onclick = () => ke('identitas');
  $('tolak').onclick = () => { localStorage.removeItem(KUNCI); for (const sec of document.querySelectorAll('[data-langkah]')) sec.hidden = sec.dataset.langkah !== 'tolak'; };
}

// ---------- identitas ----------
function isiIdentitas() {
  const f = $('form-identitas');
  if (!s.identitas.tanggal) s.identitas.tanggal = new Date().toLocaleDateString('sv-SE');
  if (!s.identitas.prodi && form.prodi) s.identitas.prodi = form.prodi;
  for (const [k, v] of Object.entries(s.identitas)) if (f.elements[k]) f.elements[k].value = v;
  const lainnya = () => {
    for (const lab of f.querySelectorAll('[data-lainnya]')) {
      lab.hidden = f.elements[lab.dataset.lainnya].value !== 'lainnya';
      lab.querySelector('input').required = !lab.hidden;
    }
  };
  lainnya();
  f.oninput = (e) => {
    s.identitas[e.target.name] = e.target.value.trim();
    e.target.removeAttribute('aria-invalid');
    lainnya();
    simpan();
  };
  f.onsubmit = (e) => {
    e.preventDefault();
    const salah = [...f.elements].filter((x) => x.name && (x.required && !x.value.trim() || x.name === 'nim' && x.value && !/^\d{6,12}$/.test(x.value.trim())));
    salah.forEach((x) => x.setAttribute('aria-invalid', 'true'));
    $('galat-identitas').hidden = !salah.length;
    if (salah.length) {
      $('galat-identitas').textContent = salah.some((x) => x.name === 'nim' && x.value) ? 'NIM diisi angka saja. Cek juga kotak yang bergaris merah.' : 'Masih ada yang kosong, lihat kotak yang bergaris merah.';
      salah[0].focus();
      return;
    }
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
      s.tanda.push({ video: v.isi, detik: Math.round(detik), catatan: '', dibuat: new Date().toISOString(), dari: 'tombol' });
      simpan();
      tandai.textContent = `Ditandai di ${mmdd(detik)}`;
      setTimeout(() => { tandai.textContent = 'Tandai menit ini'; }, 2000);
    };
    wadah.append(el('div', { className: 'video' }, el('div', { className: 'video-kepala' }, el('div', {}, urut, el('h3', { textContent: v.judul })), status), iframe,
      el('div', { className: 'video-bawah' }, el('span', { className: 'kecil', textContent: 'Ada bagian yang keliru atau membingungkan?' }), tandai)));
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

function isiVideo() {
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
function gambarTanda() {
  const ol = $('daftar-tanda');
  ol.replaceChildren();
  $('kosong-tanda').hidden = s.tanda.length > 0;
  s.tanda.sort((a, b) => a.video.localeCompare(b.video) || a.detik - b.detik).forEach((t) => {
    const catatan = el('input', { value: t.catatan, placeholder: 'Apa yang keliru atau membingungkan?', ariaLabel: `Catatan untuk menit ${mmdd(t.detik)}` });
    catatan.oninput = () => { t.catatan = catatan.value; simpan(); };
    const hapus = el('button', { type: 'button', className: 'tombol-teks', textContent: 'Hapus' });
    hapus.onclick = () => { s.tanda.splice(s.tanda.indexOf(t), 1); simpan(); gambarTanda(); };
    ol.append(el('li', {}, el('span', { className: 'waktu', textContent: mmdd(t.detik) }), catatan, hapus,
      ...(form.video.length > 1 ? [el('span', { className: 'asal', textContent: judulVideo(t.video) })] : [])));
  });
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
  ke(s.selesai ? 'selesai' : s.langkah);
}
