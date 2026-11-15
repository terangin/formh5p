// Hitungan laporan peneliti. Murni (tanpa DOM), dipakai laporan.js di browser dan dites di node.
// Satu baris = isi kolom `data` tabel jawaban (state form, lihat uji.js).

export const ASPEK = [
  ['A. Kemenarikan', [1, 2, 3, 4, 5, 6]],
  ['B. Kemudahan memahami materi', [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]],
  ['C. Kemudahan penggunaan', [17, 18, 19, 20]],
  ['D. Manfaat', [21, 22, 23, 24, 25]],
];
export const NEGATIF = new Set([4]); // "Saya merasa bosan...": setuju = buruk, skornya dibalik
export const skor = (no, nilai) => (NEGATIF.has(no) ? 6 - nilai : nilai);

// Batas kategori kelayakan (persen skor). Umum dipakai di penelitian pengembangan; ganti kalau peneliti punya acuan lain.
export const KATEGORI = [[81, 'Sangat layak'], [61, 'Layak'], [41, 'Cukup layak'], [21, 'Kurang layak'], [0, 'Tidak layak']];
export const kategori = (persen) => KATEGORI.find(([batas]) => persen >= batas)[1];

// Detik video yang pernah diputar (diulang nggak dihitung dobel), dari jejak posisi uji.js (sampel tiap ~5 detik).
// Dua sampel berurutan yang maju 0-8 detik = bagian itu diputar; loncatan lebih jauh = digeser, nggak dihitung.
// ponytail: resolusi ~5 detik, cukup buat "ditonton berapa menit"; butuh lebih teliti = catat timeupdate di pemutar.
export function detikDitonton(v, durasi) {
  const p = (v?.posisi || []).map((x) => x[1]);
  if (!p.length) return 0;
  const potong = p[0] <= 8 ? [[0, p[0]]] : [];
  for (let i = 1; i < p.length; i++) if (p[i] > p[i - 1] && p[i] - p[i - 1] <= 8) potong.push([p[i - 1], p[i]]);
  if (v.selesai > 0 && durasi && durasi - p.at(-1) <= 8 && durasi > p.at(-1)) potong.push([p.at(-1), durasi]);
  potong.sort((a, b) => a[0] - b[0]);
  let total = 0, ujung = 0;
  for (const [a, b] of potong) if (b > ujung) { total += b - Math.max(a, ujung); ujung = b; }
  return Math.round(durasi ? Math.min(total, durasi) : total);
}
export const persenDitonton = (v, durasi) => (durasi ? Math.round((detikDitonton(v, durasi) / durasi) * 100) : null);

const bulat = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const lengkap = (b) => !!b.selesai;

// Responden ganda: NIM atau email sama dengan jawaban lengkap yang selesai lebih dulu. Tetap disimpan dan ada
// di CSV mentah, tapi nggak ikut hitungan (validitas, alpha, kelayakan). Hasil: Map id ganda -> id yang dihitung.
export function cariGanda(baris) {
  const pertama = new Map(), ganda = new Map();
  for (const b of baris.filter(lengkap).sort((a, c) => a.selesai.localeCompare(c.selesai))) {
    const nim = String(b.identitas?.nim ?? '').trim(), email = String(b.identitas?.email ?? '').trim().toLowerCase();
    const kunci = [nim && `nim:${nim}`, email && `email:${email}`].filter(Boolean);
    const asal = kunci.map((k) => pertama.get(k)).find(Boolean);
    if (asal) ganda.set(b.id, asal);
    for (const k of kunci) if (!pertama.has(k)) pertama.set(k, asal || b.id);
  }
  return ganda;
}
const dihitung = (baris) => { const g = cariGanda(baris); return baris.filter((b) => lengkap(b) && !g.has(b.id)); };

export function ringkas(baris) {
  const isi = dihitung(baris);
  const n = isi.length;
  const butir = [];
  for (let no = 1; no <= 25; no++) {
    const sebaran = [0, 0, 0, 0, 0];
    let total = 0, ada = 0;
    for (const b of isi) {
      const v = b.butir?.[no];
      if (!(v >= 1 && v <= 5)) continue;
      sebaran[v - 1]++;
      total += skor(no, v);
      ada++;
    }
    butir.push({ no, sebaran, n: ada, rata: ada ? bulat(total / ada) : null, negatif: NEGATIF.has(no) });
  }
  const aspek = ASPEK.map(([nama, nomor]) => {
    let dapat = 0, maks = 0;
    for (const b of isi) for (const no of nomor) {
      const v = b.butir?.[no];
      if (v >= 1 && v <= 5) { dapat += skor(no, v); maks += 5; }
    }
    const persen = maks ? bulat((dapat / maks) * 100, 1) : null;
    return { nama, nomor, rata: maks ? bulat((dapat / maks) * 5) : null, persen, kategori: persen == null ? null : kategori(persen) };
  });
  const semua = aspek.flatMap((a) => a.nomor);
  let dapat = 0, maks = 0;
  for (const b of isi) for (const no of semua) { const v = b.butir?.[no]; if (v >= 1 && v <= 5) { dapat += skor(no, v); maks += 5; } }
  const persenTotal = maks ? bulat((dapat / maks) * 100, 1) : null;

  const hitung = (ambil) => {
    const m = new Map();
    for (const b of isi) { const k = ambil(b) || '(kosong)'; m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const perangkat = (b) => (b.identitas?.perangkat === 'lainnya' ? `Lainnya: ${b.identitas?.perangkat_lain || '-'}` : b.identitas?.perangkat);
  const menit = isi.map((b) => (Date.parse(b.selesai) - Date.parse(b.mulai)) / 60000).filter((x) => x > 0).sort((a, b) => a - b);

  return {
    n,
    ganda: cariGanda(baris).size,
    belumSelesai: baris.filter((b) => !lengkap(b)).length,
    nontonHabis: isi.filter((b) => Object.values(b.video || {}).every((v) => v.selesai > 0)).length,
    lewatiVideo: isi.filter((b) => b.lewatiVideo).length,
    menitMedian: menit.length ? bulat(menit[Math.floor(menit.length / 2)], 1) : null,
    butir,
    aspek,
    total: { persen: persenTotal, kategori: persenTotal == null ? null : kategori(persenTotal) },
    identitas: {
      'Program studi': hitung((b) => b.identitas?.prodi),
      UPBJJ: hitung((b) => b.identitas?.upbjj),
      Perangkat: hitung(perangkat),
      Semester: hitung((b) => b.identitas?.semester && `Semester ${b.identitas.semester}`),
      'Bersedia diwawancara': hitung((b) => (b.identitas?.bersedia_wawancara ? 'Ya' : 'Tidak')),
    },
    tanda: isi.flatMap((b) => (b.tanda || []).map((t) => ({ ...t, responden: b.id }))),
    catatan: isi.map((b) => ({ id: b.id, nama: b.identitas?.nama, teks: (b.catatan || '').trim() })).filter((c) => c.teks),
  };
}

// Sebaran tanda per video, dikelompokkan per `lebar` detik.
export function petaTanda(tanda, isi, durasi, lebar = 30) {
  const kotak = Array.from({ length: Math.max(1, Math.ceil(durasi / lebar)) }, (_, i) => ({ dari: i * lebar, jumlah: 0, catatan: [] }));
  for (const t of tanda) {
    if (t.video !== isi) continue;
    const k = kotak[Math.min(kotak.length - 1, Math.floor(t.detik / lebar))];
    k.jumlah++;
    if (t.catatan?.trim()) k.catatan.push(t.catatan.trim());
  }
  return kotak;
}

// CSV buat Excel/SPSS: koma, kutip ganda, BOM UTF-8 biar huruf Indonesia kebaca.
export function csv(baris, videoForm) {
  const ganda = cariGanda(baris);
  const mmdd = (d) => `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(Math.round(d % 60)).padStart(2, '0')}`;
  const kolom = [
    ['id', (b) => b.id], ['status', (b) => (ganda.has(b.id) ? 'ganda' : b.selesai ? 'lengkap' : 'belum selesai')], ['ganda_dari', (b) => ganda.get(b.id) ?? ''], ['mulai', (b) => b.mulai], ['selesai', (b) => b.selesai || ''],
    ['menit_mengisi', (b) => (b.selesai ? bulat((Date.parse(b.selesai) - Date.parse(b.mulai)) / 60000, 1) : '')],
    ...['nama', 'nim', 'email', 'prodi', 'semester', 'upbjj', 'pekerjaan', 'perangkat', 'perangkat_lain', 'tanggal'].map((k) => [k, (b) => b.identitas?.[k] ?? '']),
    ['bersedia_wawancara', (b) => (b.identitas?.bersedia_wawancara ? 'ya' : 'tidak')], ['whatsapp', (b) => b.identitas?.whatsapp ?? ''],
    ['mau_tanda_terima_kasih', (b) => (b.hadiah?.mau ? 'ya' : 'tidak')], ['dompet', (b) => b.hadiah?.dompet ?? ''], ['nomor_dompet', (b) => b.hadiah?.nomor ?? ''], ['nama_akun_dompet', (b) => b.hadiah?.nama ?? ''],
    ...Array.from({ length: 25 }, (_, i) => [`b${i + 1}`, (b) => b.butir?.[i + 1] ?? '']),
    ...ASPEK.map(([nama, nomor], i) => [`persen_${'ABCD'[i]}`, (b) => {
      const v = nomor.map((no) => b.butir?.[no]).filter((x) => x >= 1 && x <= 5);
      return v.length === nomor.length ? bulat((nomor.reduce((a, no) => a + skor(no, b.butir[no]), 0) / (nomor.length * 5)) * 100, 1) : '';
    }]),
    ...videoForm.flatMap((v) => [
      [`${v.isi}_tonton_habis`, (b) => b.video?.[v.isi]?.selesai ?? 0],
      [`${v.isi}_detik_ditonton`, (b) => detikDitonton(b.video?.[v.isi], b.video?.[v.isi]?.durasi || v.detik)],
      [`${v.isi}_persen_ditonton`, (b) => persenDitonton(b.video?.[v.isi], b.video?.[v.isi]?.durasi || v.detik)],
      [`${v.isi}_jawaban_kuis`, (b) => (b.video?.[v.isi]?.xapi || []).filter((x) => x.kata === 'answered').length],
    ]),
    ['lewati_video', (b) => (b.lewatiVideo ? 'ya' : 'tidak')],
    ['tanda', (b) => (b.tanda || []).map((t) => `${t.video} ${mmdd(t.detik)} ${t.catatan || ''}`.trim()).join(' | ')],
    ['catatan', (b) => b.catatan || ''],
    ['browser', (b) => b.perangkat?.ua ?? ''], ['layar', (b) => b.perangkat?.layar ?? ''],
  ];
  const sel = (x) => { const s = String(x ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [kolom.map(([k]) => k).join(','), ...baris.map((b) => kolom.map(([, f]) => sel(f(b))).join(','))].join('\r\n');
}

// ---------- statistik ----------
const rata = (x) => x.reduce((a, b) => a + b, 0) / x.length;
const varian = (x) => { const m = rata(x); return x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1); }; // sampel (n-1)
const pearson = (x, y) => {
  const mx = rata(x), my = rata(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
};

// r tabel (uji dua arah, α 0,05) dari t kritis: r = t / sqrt(df + t²), df = n - 2.
// t kritis didekati deret Cornish-Fisher dari z 1,96 (selisih < 0,01 dari tabel untuk df ≥ 5).
export function rTabel(n) {
  const df = n - 2;
  if (df < 1) return null;
  const z = 1.959964;
  const t = z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2) + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3);
  return bulat(t / Math.sqrt(df + t * t), 3);
}

// Cuma responden lengkap yang semua butirnya (dari daftar nomor) terisi. Skor butir negatif sudah dibalik.
const matriks = (baris, nomor) => dihitung(baris).map((b) => nomor.map((no) => b.butir?.[no])).filter((r) => r.every((v) => v >= 1 && v <= 5))
  .map((r) => r.map((v, i) => skor(nomor[i], v)));

export function cronbach(baris, nomor) {
  const m = matriks(baris, nomor), k = nomor.length;
  if (m.length < 3 || k < 2) return null;
  const totalVar = varian(m.map((r) => r.reduce((a, b) => a + b, 0)));
  if (!totalVar) return null;
  const sumVar = nomor.reduce((a, _, j) => a + varian(m.map((r) => r[j])), 0);
  return bulat((k / (k - 1)) * (1 - sumVar / totalVar), 3);
}
export const tafsirAlpha = (a) => (a == null ? '-' : a >= 0.9 ? 'Sangat tinggi' : a >= 0.8 ? 'Tinggi' : a >= 0.7 ? 'Dapat diterima' : a >= 0.6 ? 'Cukup' : 'Rendah');

// Statistik per butir + validitas (korelasi butir dengan total butir lain, terkoreksi).
export function statistikButir(baris) {
  const nomor = Array.from({ length: 25 }, (_, i) => i + 1);
  const m = matriks(baris, nomor);
  const rt = rTabel(m.length);
  return nomor.map((no, j) => {
    const x = m.map((r) => r[j]);
    if (!x.length) return { no, n: 0 };
    const sisa = m.map((r) => r.reduce((a, b) => a + b, 0) - r[j]);
    const urut = [...x].sort((a, b) => a - b);
    const r = x.length >= 3 ? pearson(x, sisa) : null;
    return {
      no, n: x.length, rata: bulat(rata(x)), sd: x.length > 1 ? bulat(Math.sqrt(varian(x))) : null,
      median: urut[Math.floor(urut.length / 2)], min: urut[0], max: urut.at(-1),
      rHitung: r == null ? null : bulat(r, 3), rTabel: rt, valid: r == null || rt == null ? null : r >= rt,
    };
  });
}

export function statistikAspek(baris) {
  const lengkapSemua = (nomor) => matriks(baris, nomor);
  const satu = (nama, nomor) => {
    const m = lengkapSemua(nomor);
    const tot = m.map((r) => r.reduce((a, b) => a + b, 0));
    return { nama, k: nomor.length, n: m.length, rataSkor: tot.length ? bulat(rata(tot)) : null, sd: tot.length > 1 ? bulat(Math.sqrt(varian(tot))) : null,
      maks: nomor.length * 5, alpha: cronbach(baris, nomor) };
  };
  return [...ASPEK.map(([nama, nomor]) => satu(nama, nomor)), satu('Keseluruhan (25 butir)', ASPEK.flatMap(([, n]) => n))];
}

// CSV data olahan: satu baris per butir, lalu per aspek. Buat lampiran / olah lanjut.
export function csvOlahan(baris) {
  const r = ringkas(baris), sb = statistikButir(baris), sa = statistikAspek(baris);
  const sel = (x) => { const s = String(x ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const baris1 = [['bagian', 'butir_atau_aspek', 'n', 'f1', 'f2', 'f3', 'f4', 'f5', 'rata_skor', 'sd', 'median', 'min', 'max', 'r_hitung', 'r_tabel', 'valid', 'persen_kelayakan', 'kategori', 'alpha', 'tafsir_alpha']];
  for (const s of sb) {
    const b = r.butir[s.no - 1];
    baris1.push(['butir', `b${s.no}${b.negatif ? ' (dibalik)' : ''}`, s.n, ...b.sebaran, s.rata, s.sd, s.median, s.min, s.max, s.rHitung, s.rTabel, s.valid == null ? '' : s.valid ? 'ya' : 'tidak', '', '', '', '']);
  }
  sa.forEach((a, i) => {
    const pk = i < r.aspek.length ? r.aspek[i] : r.total;
    baris1.push(['aspek', a.nama, a.n, '', '', '', '', '', a.rataSkor, a.sd, '', '', a.maks, '', '', '', pk.persen, pk.kategori, a.alpha, tafsirAlpha(a.alpha)]);
  });
  return '﻿' + baris1.map((x) => x.map(sel).join(',')).join('\r\n');
}

// Daftar penerima tanda terima kasih: cuma responden lengkap yang mencentang. Buat dipakai waktu transfer.
export const penerimaHadiah = (baris) => baris.filter((b) => b.selesai && b.hadiah?.mau)
  .map((b) => ({ id: b.id, nama: b.identitas?.nama, nim: b.identitas?.nim, dompet: b.hadiah.dompet, nomor: b.hadiah.nomor, namaAkun: b.hadiah.nama, selesai: b.selesai }))
  .sort((a, b) => a.selesai.localeCompare(b.selesai));
export function csvHadiah(baris) {
  const sel = (x) => { const s = String(x ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [['nama', 'nim', 'dompet', 'nomor', 'nama_akun', 'selesai', 'id'], ...penerimaHadiah(baris).map((p) => [p.nama, p.nim, p.dompet, p.nomor, p.namaAkun, p.selesai, p.id])]
    .map((x) => x.map(sel).join(',')).join('\r\n');
}
