// Data CONTOH buat laporan versi lokal. Bukan data responden. Acak tapi tetap sama tiap dibuka (seed per form).
import { PRODI, UPBJJ } from './konfig.js';

function acak(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pilihBobot = (r, pilihan, bobot) => { let x = r() * bobot.reduce((a, b) => a + b, 0); for (let i = 0; i < pilihan.length; i++) if ((x -= bobot[i]) < 0) return pilihan[i]; return pilihan.at(-1); };
const CATATAN = ['Narasi terlalu cepat di bagian ini', 'Teks di layar terlalu kecil di HP', 'Contohnya kurang jelas', 'Musik latar menutupi suara narator',
  'Istilah ini belum dijelaskan sebelumnya', 'Gambar dan penjelasan tidak sinkron', 'Video sempat macet', 'Bagian ini menarik dan mudah dipahami'];
const UMUM = ['Secara umum videonya membantu, tapi beberapa istilah perlu dijelaskan.', 'Durasinya pas. Kuis di tengah video bikin lebih fokus.',
  'Sebaiknya ada subtitle.', 'Suara narator enak didengar.', 'Di HP teksnya agak kecil.', ''];

export function buatDummy(kode, form, n = 42) {
  const r = acak([...kode].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const semuaProdi = PRODI.flatMap(([, d]) => d);
  const awal = Date.parse('2026-11-20T08:00:00Z');
  // Titik "masalah" per video biar petanya kelihatan berkelompok, kayak data asli.
  const titik = Object.fromEntries(form.video.map((v) => [v.isi, [0.2, 0.55, 0.8].map((p) => Math.round(v.detik * p))]));
  return Array.from({ length: n }, (_, i) => {
    const mulai = awal + Math.floor(r() * 5 * 86400000);
    const lengkap = r() > 0.1;
    const lama = (18 + r() * 25) * 60000;
    // Tiap responden punya "kesan" umum (2,6–4,9); jawaban butir = kesan + sedikit acak, biar konsisten kayak data asli
    // (kalau diacak per butir, alpha dan validitas jadi ngaco). Butir 4 negatif: dijawab kebalikannya.
    const kesan = 2.6 + r() * 2.3;
    const butir = {};
    for (let no = 1; no <= 25; no++) {
      const geser = no === 18 ? -0.6 : no === 13 ? -0.4 : 0; // buffering & teks kecil sedikit lebih rendah
      const v = Math.min(5, Math.max(1, Math.round(kesan + geser + (r() - 0.5) * 1.6)));
      if (lengkap || no < 10) butir[no] = no === 4 ? 6 - v : v;
    }
    const tanda = [];
    for (const v of form.video) for (const t of titik[v.isi]) {
      if (r() < 0.35) tanda.push({ video: v.isi, detik: Math.max(0, Math.round(t + (r() - 0.5) * 40)), catatan: r() < 0.8 ? CATATAN[Math.floor(r() * CATATAN.length)] : '', dari: r() < 0.85 ? 'tombol' : 'ketik' });
    }
    const bersedia = r() < 0.4;
    const lewatiVideo = lengkap && r() < 0.05;
    return {
      versi: 1, id: `contoh-${kode}-${String(i + 1).padStart(2, '0')}`, form: kode,
      mulai: new Date(mulai).toISOString(), selesai: lengkap ? new Date(mulai + lama).toISOString() : null,
      persetujuan: new Date(mulai).toISOString(),
      identitas: {
        nama: `Responden Contoh ${i + 1}`, nim: String(40000000 + Math.floor(r() * 9999999)), email: `contoh${i + 1}@contoh.invalid`,
        prodi: r() < 0.8 && form.prodi ? form.prodi : semuaProdi[Math.floor(r() * semuaProdi.length)],
        semester: String(1 + Math.floor(r() * 8)), upbjj: pilihBobot(r, ['Jakarta', 'Bogor', 'Bandung', 'Serang', ...UPBJJ.slice(0, 6)], [9, 7, 3, 2, 1, 1, 1, 1, 1, 1]),
        pekerjaan: pilihBobot(r, ['Guru', 'Karyawan swasta', 'Tidak bekerja', 'Wiraswasta', 'PNS'], [5, 4, 3, 2, 1]),
        perangkat: pilihBobot(r, ['HP Android', 'Laptop', 'HP iOS (iPhone)', 'PC', 'Tablet'], [9, 5, 2, 1, 1]),
        tanggal: new Date(mulai).toISOString().slice(0, 10), bersedia_wawancara: bersedia, ...(bersedia ? { whatsapp: `0812000${String(i).padStart(5, '0')}` } : {}),
      },
      butir, catatan: lengkap ? UMUM[Math.floor(r() * UMUM.length)] : '', tanda: lengkap ? tanda : [],
      lewatiVideo,
      video: Object.fromEntries(form.video.map((v) => [v.isi, { durasi: v.detik, selesai: lengkap && !lewatiVideo ? 1 + (r() < 0.2 ? 1 : 0) : 0, posisi: [],
        xapi: Array.from({ length: 4 }, () => ({ kata: 'answered', skor: { dapat: r() < 0.7 ? 1 : 0, maks: 1 } })) }])),
      perangkat: { ua: 'Contoh', layar: pilihBobot(r, ['412x915', '1366x768', '390x844'], [6, 3, 2]) },
    };
  });
}
