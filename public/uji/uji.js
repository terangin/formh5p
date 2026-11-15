// Form uji coba video pembelajaran UT (nyalain.kitaterangin.id/uji/<kode>).
// Video diputar pemutar Wello (h5p.wello.web.id/tonton) di iframe; protokol postMessage
// ada di kepala tonton.js repo h5p-player. Versi coba: semua data baru disimpan di localStorage.
import { FORM, BUTIR, PRODI, UPBJJ } from './konfig.js';
import { pasangHadiah, periksaHadiah, HADIAH_AKTIF } from './hadiah.js';
import { detikDitonton } from './hitung.js';

const PEMUTAR = location.hostname === 'localhost' ? 'http://localhost:8093' : 'https://h5p.wello.web.id';




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
  const menitVideo = Math.round(form.video.reduce((a, v) => a + v.detik, 0) / 60);
  const menit = Math.ceil((menitVideo + 15) / 5) * 5;
  $('teks-persetujuan').innerHTML = `
    <p class="pengantar">Tim peneliti Fakultas Keguruan dan Ilmu Pendidikan (FKIP) Universitas Terbuka mengundang Anda berpartisipasi dalam uji coba video pembelajaran mata kuliah <b></b>. Uji coba ini bertujuan menemukan kesalahan, bagian yang membingungkan, dan kendala teknis sebelum video digunakan secara lebih luas.</p>
    <ul class="poin">
      <li><b>Perkiraan waktu sekitar ${menit} menit</b><span>Termasuk menonton ${nVideo} dengan total durasi sekitar ${menitVideo} menit, serta mengisi identitas, angket, dan catatan.</span></li>
      <li><b>Partisipasi bersifat sukarela</b><span>Anda dapat berhenti atau mengundurkan diri kapan saja tanpa perlu memberikan alasan.</span></li>
      <li><b>Tidak memengaruhi nilai akademik</b><span>Keikutsertaan maupun jawaban Anda tidak berpengaruh pada nilai mata kuliah. Tidak ada jawaban yang benar atau salah.</span></li>
      <li><b>Kerahasiaan data terjaga</b><span>Data hanya digunakan oleh tim peneliti untuk penelitian ini, dan hasilnya dilaporkan tanpa menyebut nama Anda.</span></li>
    </ul>
    <h3>Prosedur</h3>
    <ol class="alur">
      <li>Mengisi identitas</li>
      <li>Menonton ${nVideo} sampai selesai</li>
      <li>Mengisi 25 pernyataan</li>
      <li>Menulis catatan (opsional)</li>
    </ol>
    <p class="kecil">Apabila bersedia, Anda dapat dihubungi untuk wawancara lanjutan.</p>
    <details class="rincian">
      <summary>Rincian data yang dikumpulkan dan penyimpanannya</summary>
      <h4>Data yang dikumpulkan</h4>
      <ul>
        <li>Isian Anda: identitas (termasuk email, dan nomor WhatsApp bila Anda bersedia diwawancara), jawaban angket, catatan, dan menit yang Anda tandai.</li>
        ${HADIAH_AKTIF ? '<li>Bila Anda ingin menerima tanda terima kasih: jenis dompet digital, nomor, dan nama pemilik akun.</li>' : ''}
        <li>Selama menonton: bagian video yang diputar, diulang, atau dilewati, dan jawaban kuis di dalam video.</li>
        <li>Perangkat: jenis browser, ukuran layar, zona waktu, dan perkiraan kecepatan internet.</li>
      </ul>
      <h4>Akses dan masa penyimpanan</h4>
      <p>Data hanya dapat diakses oleh tim peneliti. Email dan nomor WhatsApp hanya dipakai peneliti untuk menghubungi Anda terkait penelitian ini.${HADIAH_AKTIF ? ' Data dompet digital hanya dipakai untuk mengirim tanda terima kasih.' : ''} Data disimpan di server Cloudflare dan dihapus setelah penelitian selesai.</p>
      <p>Formulir ini disediakan Nyalain (dari Terangin). Nyalain tidak memakai data Anda untuk keperluan lain dan tidak mengirimi Anda promosi.</p>
    </details>
    <div class="kecil"><p>Pertanyaan mengenai penelitian ini dapat disampaikan kepada peneliti:</p><ul class="kontak" id="kontak-peneliti"></ul></div>
    <div class="pernyataan">
      <h3>Pernyataan persetujuan</h3>
      <p>Dengan mencentang kotak di bawah ini, saya menyatakan bahwa:</p>
      <ol>
        <li>Saya telah membaca dan memahami penjelasan mengenai tujuan, prosedur, serta penggunaan data dalam uji coba ini.</li>
        <li>Saya bersedia berpartisipasi secara sukarela tanpa paksaan dari pihak mana pun.</li>
        <li>Saya memahami bahwa saya dapat mengundurkan diri kapan saja tanpa konsekuensi terhadap nilai akademik saya.</li>
        <li>Saya mengizinkan data yang saya berikan digunakan untuk keperluan penelitian ini sebagaimana dijelaskan di atas.</li>
      </ol>
    </div>`;
  $('teks-persetujuan').querySelector('b').textContent = form.matkul;
  $('kontak-peneliti').replaceChildren(...form.kontak.map(([nama, prodi, hp]) => el('li', {},
    el('b', { textContent: nama }), `Dosen Program Studi ${prodi}`, el('a', { href: `tel:${hp.replace(/\D/g, '')}`, textContent: hp }))));
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
  // Form yang punya prodi (semua form sekarang): prodi dikunci sesuai mata kuliah (keputusan user 2026-11-14).
  // Daftar PRODI lengkap tetap dipakai kalau suatu form nggak punya `prodi`.
  if (form.prodi) { s.identitas.prodi = form.prodi; f.elements.prodi.readOnly = true; f.elements.prodi.removeAttribute('placeholder'); }
  else $('daftar-prodi').append(...PRODI.flatMap(([fak, daftar]) => daftar.map((p) => el('option', { value: p, label: fak }))));
  $('daftar-upbjj').append(...UPBJJ.map((u) => el('option', { value: u })));
  const resmi = { prodi: form.prodi ? [form.prodi] : PRODI.flatMap(([, d]) => d), upbjj: UPBJJ };
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
// Pemutar dicari dari halaman tiap kali perlu (contentWindow baru ada setelah iframe terpasang).
const semuaPemutar = () => [...document.querySelectorAll('.video iframe[data-isi]')];
let tanyaId = 0, jamPosisi;
const tunggu = new Map(); // id minta-waktu -> fungsi

// Satu blok pemutar + tombol tandai. ulang = dipakai di langkah Catatan (tonton ulang): tanda baru
// langsung muncul di daftar Catatan, bukan di bawah video.
function blokVideo(v, ulang) {
  const iframe = el('iframe', { src: `${PEMUTAR}/tonton?isi=${v.isi}`, title: `Pemutar ${v.judul}`, allow: 'fullscreen', loading: 'eager' });
  iframe.dataset.isi = v.isi;
  if (ulang) iframe.dataset.ulang = '1';
  const status = ulang ? '' : el('span', { className: 'status-video', id: `status-${v.isi}` });
  const urut = form.video.length > 1 ? el('span', { className: 'urut', textContent: `Video ${form.video.indexOf(v) + 1} dari ${form.video.length}` }) : '';
  const tandai = el('button', { type: 'button', className: 'tombol-dua', textContent: 'Tandai menit ini' });
  tandai.onclick = async () => {
    const detik = await mintaWaktu(iframe.contentWindow);
    if (detik == null) return;
    const t = { video: v.isi, detik: Math.round(detik), catatan: '', dibuat: new Date().toISOString(), dari: ulang ? 'tonton-ulang' : 'tombol' };
    s.tanda.push(t);
    simpan();
    gambarTandaVideo(v.isi);
    gambarTanda();
    // langsung nulis selagi ingat
    (ulang ? $('daftar-tanda') : $(`tanda-${v.isi}`))?.querySelector(`[data-dibuat="${t.dibuat}"]`)?.focus();
  };
  return el('div', { className: 'video' }, el('div', { className: 'video-kepala' }, el('div', {}, urut, el('h3', { textContent: v.judul })), status), iframe,
    el('div', { className: 'video-bawah' }, el('span', { className: 'kecil', textContent: 'Ada bagian yang keliru atau membingungkan? Tekan saat bagian itu muncul, lalu tulis catatannya (jeda videonya dulu kalau perlu).' }), tandai),
    ulang ? '' : el('ol', { className: 'daftar-tanda', id: `tanda-${v.isi}` }));
}

let videoTerpasang = false;
function pasangVideo() {
  if (videoTerpasang) return;
  videoTerpasang = true;
  for (const v of form.video) {
    $('daftar-video').append(blokVideo(v, false));
    gambarTandaVideo(v.isi);
  }
  perbaruiStatus();
}

// Data nonton pertama di s.video[isi]; tonton ulang (langkah Catatan) dipisah di s.video[isi].ulang
// biar jejak dan jawaban kuisnya nggak kecampur.
const catatanVideo = (f) => {
  const v = s.video[f.dataset.isi];
  return f.dataset.ulang ? (v.ulang ??= { xapi: [], posisi: [], selesai: 0, gagal: null }) : v;
};

// Catat posisi tiap 5 detik, cuma pemutar yang kelihatan: dari sini ketahuan bagian yang diulang/dilewati.
let sedangSampel = false;
function mulaiJamPosisi() {
  jamPosisi = setInterval(async () => {
    if (document.hidden || sedangSampel) return;
    const kelihatan = semuaPemutar().filter((f) => f.offsetParent !== null);
    if (!kelihatan.length) return;
    sedangSampel = true;
    try {
      const hasil = await Promise.all(kelihatan.map((f) => mintaWaktu(f.contentWindow)));
      kelihatan.forEach((f, i) => {
        const d = hasil[i], p = catatanVideo(f).posisi;
        if (d != null && (!p.length || Math.abs(p[p.length - 1][1] - d) > 0.5)) p.push([Date.now() - Date.parse(s.mulai), Math.round(d * 10) / 10]);
      });
      simpan();
      perbaruiStatus();
    } finally { sedangSampel = false; }
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
  const f = semuaPemutar().find((x) => x.contentWindow === e.source);
  if (!f) return;
  const d = e.data, v = catatanVideo(f);
  const ts = Date.now() - Date.parse(s.mulai);
  if (d.jenis === 'waktu') { tunggu.get(d.id)?.(d.detik); tunggu.delete(d.id); return; }
  if (d.jenis === 'tinggi') {
    if (d.px > 150) f.style.height = `${Math.min(d.px, 1400)}px`;
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
const ditonton = (v) => { const dur = s.video[v.isi].durasi || v.detik; return [detikDitonton(s.video[v.isi], dur), dur]; };
function perbaruiStatus() {
  for (const v of form.video) {
    const st = $(`status-${v.isi}`), x = s.video[v.isi];
    if (!st) continue;
    const [d, dur] = ditonton(v);
    st.textContent = x.gagal ? 'Gagal dimuat' : x.selesai ? 'Sudah ditonton' : d ? `Ditonton ${mmdd(d)} dari ${mmdd(dur)}` : 'Belum ditonton';
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
    li(form.video.length > 1 ? 'Mohon tonton kedua video sampai selesai sebelum mengisi angket, agar penilaian Anda utuh.' : 'Mohon tonton video sampai selesai sebelum mengisi angket, agar penilaian Anda utuh.'),
  );
}

function isiVideo() {
  isiCara();
  $('lanjut-video').onclick = () => {
    if (semuaSelesai() || s.lewatiVideo) return ke('angket');
    const kurang = form.video.filter((v) => !(s.video[v.isi].selesai > 0)).map((v) => { const [d, dur] = ditonton(v); return d ? `${v.judul} baru ditonton ${mmdd(d)} dari ${mmdd(dur)}` : `${v.judul} belum ditonton`; });
    $('galat-video').textContent = `${kurang.join('; ')}. Penilaian paling berguna bila video ditonton sampai habis, tetapi Anda tetap boleh lanjut ke angket.`;
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
  const catatan = el('input', { value: t.catatan, placeholder: 'Apa yang keliru atau membingungkan?', ariaLabel: `Catatan untuk menit ${mmdd(t.detik)}` });
  catatan.dataset.dibuat = t.dibuat;
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
  $('penjelasan-ulang').replaceChildren(...[
    'Bagian ini tidak wajib. Penayangan pertama Anda sudah tercatat.',
    'Video tidak perlu ditonton sampai selesai lagi, dan soal di dalam video yang sudah Anda jawab tidak perlu dijawab ulang.',
    form.majuDikunci
      ? 'Video ini tidak bisa dilompati ke depan, jadi putar dari awal sampai bagian yang ingin ditandai. Soal yang muncul boleh dilewati dengan menekan tombol putar.'
      : 'Geser atau putar video ke bagian yang ingin ditandai.',
    'Tekan Tandai menit ini, lalu tulis catatannya di daftar di atas.',
  ].map((t) => el('li', { textContent: t })));
  // Tonton ulang: pemutar baru dimuat waktu kotaknya dibuka, biar nggak ngunduh video kalau nggak perlu.
  $('tonton-ulang').addEventListener('toggle', () => {
    // Ditutup = pemutar dibuang (pemutar nggak punya perintah jeda dari luar, jadi ini satu-satunya cara berhentiin).
    if (!$('tonton-ulang').open) return $('video-ulang').replaceChildren();
    if ($('video-ulang').childElementCount) return;
    s.tontonUlang ??= new Date().toISOString();
    simpan();
    $('video-ulang').append(...form.video.map((v) => blokVideo(v, true)));
  });
  $('catatan').value = s.catatan;
  $('catatan').oninput = (e) => { s.catatan = e.target.value; simpan(); };
  const pilih = $('pilih-video-tanda');
  for (const v of form.video) pilih.append(el('option', { value: v.isi, textContent: v.judul }));
  pilih.closest('label').hidden = form.video.length < 2;
  $('form-tanda').onsubmit = (e) => {
    e.preventDefault();
    const m = e.target.elements.menit.value.match(/^(\d{1,3}):([0-5]\d)$/);
    if (!m) return e.target.elements.menit.setAttribute('aria-invalid', 'true');
    e.target.elements.menit.removeAttribute('aria-invalid');
    const t = { video: pilih.value, detik: +m[1] * 60 + +m[2], catatan: '', dibuat: new Date().toISOString(), dari: 'ketik' };
    s.tanda.push(t);
    e.target.reset();
    simpan();
    gambarTanda();
    gambarTandaVideo(t.video);
    $('daftar-tanda').querySelector(`[data-dibuat="${t.dibuat}"]`)?.focus(); // langsung tulis catatannya
  };
  // Form 1 video: kolom pilih video disembunyikan, jadi kalimatnya nggak nyuruh milih.
  $('penjelasan-manual').replaceChildren(
    'Masih ingat ada bagian yang keliru atau membingungkan tetapi belum ditandai? ',
    form.video.length > 1 ? 'Pilih videonya, ketik menitnya' : 'Ketik menitnya',
    ' dengan format menit:detik (contoh ', el('b', { textContent: '03:15' }), ' berarti menit ke-3 detik ke-15), lalu tekan ',
    el('b', { textContent: 'Tambah' }), '. Kotak catatannya akan muncul di daftar di atas.',
  );
  $('kirim').onclick = async () => {
    const tombol = $('kirim');
    const galatHadiah = periksaHadiah({ s, $ });
    $('galat-hadiah').textContent = galatHadiah || '';
    $('galat-hadiah').hidden = !galatHadiah;
    if (galatHadiah) return;
    tombol.disabled = true;
    tombol.textContent = 'Mengirim...';
    s.selesai = new Date().toISOString();
    simpan();
    if (await keServer()) {
      clearInterval(jamPosisi);
      for (const f of semuaPemutar()) f.remove(); // berhentiin video yang mungkin masih jalan
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
  pasangHadiah({ s, simpan, $ });
  if (!s.selesai) mulaiJamPosisi();
  $('versi-coba').hidden = !LOKAL;
  if (LOKAL) pasangBilahDev();
  ke(s.selesai ? 'selesai' : s.langkah);
}
