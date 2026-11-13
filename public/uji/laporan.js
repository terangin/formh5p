// Laporan peneliti. Lokal (localhost): pakai data CONTOH dari dummy.js. Situs asli: ambil dari API (belum dibikin,
// nunggu login peneliti). Semua isian responden ditulis lewat textContent, jangan innerHTML (A05).
import { FORM, BUTIR } from './konfig.js';
import { ringkas, petaTanda, csv, csvOlahan, statistikButir, statistikAspek, tafsirAlpha } from './hitung.js';

const LOKAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const SKALA = ['Sangat tidak setuju', 'Tidak setuju', 'Ragu-ragu', 'Setuju', 'Sangat setuju'];
const TEKS_BUTIR = BUTIR.flatMap(([, d]) => d);
const $ = (id) => document.getElementById(id);
const el = (tag, attr = {}, ...anak) => { const e = Object.assign(document.createElement(tag), attr); e.append(...anak); return e; };
const mmdd = (d) => `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(Math.floor(d % 60)).padStart(2, '0')}`;
const angka = (x, d = 2) => (x == null ? '–' : Number(x).toLocaleString('id-ID', { maximumFractionDigits: d }));

async function ambil(kode) {
  if (LOKAL) {
    const { buatDummy } = await import('./dummy.js');
    return buatDummy(kode, FORM[kode]);
  }
  const r = await fetch(`/uji/api/laporan?form=${encodeURIComponent(kode)}`, { credentials: 'same-origin' });
  if (r.status === 401 || r.status === 404) throw new Error('Halaman laporan di situs asli belum aktif: login peneliti belum dipasang.');
  if (!r.ok) throw new Error('Data belum bisa diambil. Coba muat ulang halaman.');
  return (await r.json()).baris;
}

function unduh(nama, isi) {
  const a = el('a', { href: URL.createObjectURL(new Blob([isi], { type: 'text/csv;charset=utf-8' })), download: nama });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const tabel = (kepala, baris) => el('table', { className: 'tabel' },
  el('thead', {}, el('tr', {}, ...kepala.map((k) => el('th', { scope: 'col', textContent: k })))),
  el('tbody', {}, ...baris.map((b) => el('tr', {}, ...b.map((x, i) => el(i ? 'td' : 'th', { scope: i ? undefined : 'row', textContent: x ?? '–' }))))));

function tampil(kode, baris) {
  const form = FORM[kode];
  const r = ringkas(baris), sb = statistikButir(baris), sa = statistikAspek(baris);
  const total = sa.at(-1);
  $('judul').textContent = form.matkul;
  $('sub').textContent = form.video.map((v) => v.judul).join(' · ');

  $('ubin').replaceChildren(...[
    ['Responden lengkap', r.n, `dari ${r.n + r.belumSelesai} yang memulai`],
    ['Menonton sampai habis', `${r.n ? Math.round((r.nontonHabis / r.n) * 100) : 0}%`, `${r.nontonHabis} responden${r.lewatiVideo ? `; ${r.lewatiVideo} lanjut tanpa menonton habis` : ''}`],
    ['Waktu mengisi (median)', r.menitMedian == null ? '–' : `${angka(r.menitMedian, 0)} menit`, 'dari mulai sampai kirim'],
    ['Kelayakan keseluruhan', r.total.persen == null ? '–' : `${angka(r.total.persen, 1)}%`, r.total.kategori || ''],
    ['Reliabilitas (alpha)', angka(total.alpha, 3), tafsirAlpha(total.alpha)],
  ].map(([label, nilai, ket]) => el('div', { className: 'ubin-isi' }, el('span', { className: 'ubin-label', textContent: label }), el('b', { textContent: nilai }), el('span', { className: 'ubin-ket', textContent: ket }))));

  // Kelayakan per aspek: batang horizontal 0–100, garis batas kategori.
  $('aspek').replaceChildren(...[...r.aspek, { nama: 'Keseluruhan', persen: r.total.persen, kategori: r.total.kategori }].map((a) =>
    el('div', { className: `baris-aspek${a.nama === 'Keseluruhan' ? ' total' : ''}`, title: `${a.nama}: ${angka(a.persen, 1)}% (${a.kategori})` },
      el('span', { className: 'nama-aspek', textContent: a.nama }),
      el('div', { className: 'jalur' }, el('div', { className: 'isi', style: `width:${a.persen ?? 0}%` })),
      el('span', { className: 'nilai-aspek' }, el('b', { textContent: `${angka(a.persen, 1)}%` }), ` ${a.kategori || ''}`))));
  $('tabel-aspek').replaceChildren(tabel(['Aspek', 'Jumlah butir', 'n', 'Rata-rata skor', 'SD', 'Skor maks', 'Persen', 'Kategori', 'Alpha', 'Tafsir'],
    sa.map((a, i) => { const pk = i < r.aspek.length ? r.aspek[i] : r.total; return [a.nama, a.k, a.n, angka(a.rataSkor), angka(a.sd), a.maks, `${angka(pk.persen, 1)}%`, pk.kategori, angka(a.alpha, 3), tafsirAlpha(a.alpha)]; })));

  // Sebaran per butir: batang 100% bertumpuk, warna diverging (bata ↔ navy, abu di tengah), angka langsung di batang.
  $('legenda').replaceChildren(...SKALA.map((s, i) => el('span', {}, el('i', { className: `w${i + 1}` }), `${i + 1} ${s}`)));
  let no = 0;
  $('butir').replaceChildren(...BUTIR.map(([aspek, daftar]) => el('div', { className: 'grup-butir' }, el('h3', { textContent: aspek }), ...daftar.map(() => {
    const b = r.butir[no], s = sb[no], teks = TEKS_BUTIR[no]; no++;
    const total = b.sebaran.reduce((x, y) => x + y, 0) || 1;
    return el('div', { className: 'baris-butir' },
      el('p', {}, el('b', { textContent: `${b.no}. ` }), teks, b.negatif ? el('em', { textContent: ' (negatif, skor dibalik)' }) : ''),
      el('div', { className: 'tumpuk', role: 'img', ariaLabel: `Butir ${b.no}: ${b.sebaran.map((f, i) => `${SKALA[i]} ${f}`).join(', ')}` },
        ...b.sebaran.map((f, i) => f ? el('div', { className: `w${i + 1}`, style: `flex:${f}`, title: `${i + 1} ${SKALA[i]}: ${f} responden (${Math.round((f / total) * 100)}%)` },
          f / total >= 0.07 ? el('span', { textContent: f }) : '') : '')),
      el('div', { className: 'angka-butir' },
        el('span', {}, 'Rata-rata ', el('b', { textContent: angka(b.rata) })),
        el('span', {}, 'SD ', el('b', { textContent: angka(s.sd) })),
        el('span', { className: s.valid === false ? 'tidak-valid' : '' }, 'r ', el('b', { textContent: angka(s.rHitung, 3) }), s.valid == null ? '' : s.valid ? ' valid' : ' tidak valid')));
  }))));
  $('tabel-butir').replaceChildren(tabel(['Butir', 'n', 'f1', 'f2', 'f3', 'f4', 'f5', 'Rata-rata', 'SD', 'Median', 'Min', 'Maks', 'r hitung', 'r tabel', 'Valid'],
    sb.map((s) => { const b = r.butir[s.no - 1]; return [`${s.no}${b.negatif ? '*' : ''}`, s.n, ...b.sebaran, angka(s.rata), angka(s.sd), s.median, s.min, s.max, angka(s.rHitung, 3), angka(s.rTabel, 3), s.valid == null ? '–' : s.valid ? 'Ya' : 'Tidak']; })));

  // Peta tanda per video: kolom per 30 detik.
  $('peta').replaceChildren(...form.video.map((v) => {
    const kotak = petaTanda(r.tanda, v.isi, v.detik);
    const maks = Math.max(1, ...kotak.map((k) => k.jumlah));
    const daftar = r.tanda.filter((t) => t.video === v.isi && t.catatan?.trim()).sort((a, b) => a.detik - b.detik);
    return el('div', { className: 'peta-video' },
      el('h3', { textContent: `${v.judul} (${mmdd(v.detik)})` }),
      el('div', { className: 'kolom-peta' }, ...kotak.map((k) => el('div', { className: 'kolom', title: `${mmdd(k.dari)}–${mmdd(Math.min(v.detik, k.dari + 30))}: ${k.jumlah} tanda` },
        el('div', { className: 'kolom-isi', style: `height:${(k.jumlah / maks) * 100}%` }, k.jumlah ? el('span', { textContent: k.jumlah }) : '')))),
      el('div', { className: 'sumbu-peta' }, el('span', { textContent: '00:00' }), el('span', { textContent: mmdd(v.detik / 2) }), el('span', { textContent: mmdd(v.detik) })),
      el('details', { className: 'rincian' }, el('summary', { textContent: `Catatan pada tanda (${daftar.length})` }),
        el('ul', { className: 'daftar-catatan' }, ...daftar.map((t) => el('li', {}, el('span', { className: 'waktu-kecil', textContent: mmdd(t.detik) }), t.catatan)))));
  }));

  $('profil').replaceChildren(...Object.entries(r.identitas).map(([judul, isi]) => {
    const maks = Math.max(1, ...isi.map(([, n]) => n));
    const tampilkan = isi.length > 8 ? [...isi.slice(0, 7), ['Lainnya', isi.slice(7).reduce((a, [, n]) => a + n, 0)]] : isi;
    return el('div', { className: 'profil' }, el('h3', { textContent: judul }), ...tampilkan.map(([k, n]) => el('div', { className: 'baris-profil', title: `${k}: ${n}` },
      el('span', { className: 'nama-profil', textContent: k }), el('div', { className: 'jalur kecil' }, el('div', { className: 'isi', style: `width:${(n / maks) * 100}%` })), el('b', { textContent: n }))));
  }));

  $('catatan').replaceChildren(...(r.catatan.length ? r.catatan.map((c) => el('li', {}, el('span', { className: 'waktu-kecil', textContent: c.nama || c.id }), c.teks)) : [el('li', { textContent: 'Belum ada catatan.' })]));

  $('responden').replaceChildren(tabel(['Nama', 'NIM', 'Email', 'Prodi', 'UPBJJ', 'Status', 'Mulai', 'Menit', 'Wawancara', 'WhatsApp'],
    [...baris].sort((a, b) => a.mulai.localeCompare(b.mulai)).map((b) => [b.identitas?.nama, b.identitas?.nim, b.identitas?.email, b.identitas?.prodi, b.identitas?.upbjj,
      b.selesai ? 'Lengkap' : 'Belum selesai', new Date(b.mulai).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      b.selesai ? angka((Date.parse(b.selesai) - Date.parse(b.mulai)) / 60000, 0) : '–', b.identitas?.bersedia_wawancara ? 'Ya' : 'Tidak', b.identitas?.whatsapp])));

  const tgl = new Date().toISOString().slice(0, 10);
  $('unduh-mentah').onclick = () => unduh(`${kode}-mentah-${tgl}.csv`, csv(baris, form.video));
  $('unduh-olahan').onclick = () => unduh(`${kode}-olahan-${tgl}.csv`, csvOlahan(baris));
  $('isi').hidden = false;
}

async function buka(kode) {
  history.replaceState(null, '', `?form=${kode}`);
  for (const t of $('tab-form').children) t.setAttribute('aria-current', t.dataset.kode === kode ? 'page' : 'false');
  try {
    $('galat').hidden = true;
    tampil(kode, await ambil(kode));
  } catch (e) {
    $('isi').hidden = true;
    $('galat').textContent = e.message;
    $('galat').hidden = false;
  }
}

$('contoh').hidden = !LOKAL;
$('tab-form').append(...Object.entries(FORM).map(([kode, f]) => {
  const t = el('button', { type: 'button', textContent: f.video.length > 1 ? `${f.matkul.split(' (')[0]}` : `${f.matkul} · ${f.video[0].judul}` });
  t.dataset.kode = kode;
  t.onclick = () => buka(kode);
  return t;
}));
const awal = new URLSearchParams(location.search).get('form');
buka(FORM[awal] ? awal : Object.keys(FORM)[0]);
