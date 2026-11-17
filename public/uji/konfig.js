// Konfigurasi bersama form responden (uji.js) dan laporan peneliti (laporan.js).
export const FORM = {
  'ut-tp': {
    matkul: 'Produksi Bahan Pembelajaran Berbasis Online (SPTP4401)', prodi: 'Teknologi Pendidikan', periksa: 'Check', majuDikunci: true,
    kontak: [['Dra. Marisa, M.Pd.', 'Teknologi Pendidikan', '0817-4825-201'], ['Dra. Susy Puspitasari, M.Pd.', 'Teknologi Pendidikan', '0857-7776-6201']],
    cakupan: 'Instrumen ini digunakan untuk mengujicobakan 5 mata kuliah berpraktik di Program Studi Teknologi Pendidikan FKIP UT, yaitu Produksi Media Sederhana Tiga Dimensi, Perancangan Web Pembelajaran, Manajemen Penyiaran Televisi, Produksi Media Audio Video, dan Produksi Bahan Pembelajaran Online. Uji coba ini ditujukan untuk semua mahasiswa yang sudah mengambil salah satu mata kuliah berpraktik tersebut.',
    video: [{ isi: 'tp1-8a082ca8', judul: 'Video Bagian 1', detik: 398 }, { isi: 'tp2-3a0b90ab', judul: 'Video Bagian 2', detik: 464 }],
  },
  'ut-bindo-1': {
    matkul: 'Bahasa Indonesia', prodi: 'Pendidikan Bahasa dan Sastra Indonesia', periksa: 'Periksa', majuDikunci: true,
    kontak: [['Murni Maulina, M.Pd.', 'Pendidikan Bahasa dan Sastra Indonesia', '0851-5744-9149']],
    video: [{ isi: 'bi1-67b38ac4', judul: 'Ketika Perbedaan Menjadi Solusi', detik: 415 }],
  },
  'ut-bindo-2': {
    matkul: 'Bahasa Indonesia', prodi: 'Pendidikan Bahasa dan Sastra Indonesia', periksa: 'Periksa', majuDikunci: true,
    kontak: [['Murni Maulina, M.Pd.', 'Pendidikan Bahasa dan Sastra Indonesia', '0851-5744-9149']],
    video: [{ isi: 'bi2-f51501ab', judul: 'Batik Bercerita: Sebuah Wawancara tentang Warisan Indonesia', detik: 452 }],
  },
  'ut-pai': {
    matkul: 'Pendidikan Agama Islam', prodi: 'Pendidikan Agama Islam (PAI)', periksa: 'Check', majuDikunci: false, tombolLompat: true,
    kontak: [['Muhammad Sulaiman, S.Pd.I., B.I.S., M.Pd.', 'Pendidikan Agama Islam', '0811-7199-888']],
    video: [{ isi: 'lumi-59763deb', judul: 'Video Pembelajaran Pendidikan Agama Islam', detik: 927 }],
  },
};

// Instrumen dari docx peneliti. Butir 4 pernyataan negatif: skornya dibalik waktu dilaporkan, bukan di sini.
export const BUTIR = [
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
export const PRODI = [
  ['FKIP', ['Pendidikan Bahasa dan Sastra Indonesia', 'Pendidikan Bahasa Inggris', 'Pendidikan Biologi', 'Pendidikan Fisika', 'Pendidikan Kimia',
    'Pendidikan Matematika', 'Pendidikan Ekonomi', 'Pendidikan Pancasila dan Kewarganegaraan', 'Teknologi Pendidikan',
    'Pendidikan Guru Sekolah Dasar (PGSD)', 'Pendidikan Guru Pendidikan Anak Usia Dini (PGPAUD)', 'Pendidikan Agama Islam (PAI)']],
  ['FEB', ['Manajemen', 'Ekonomi Pembangunan', 'Ekonomi Syariah', 'Akuntansi', 'Akuntansi Keuangan Publik', 'Pariwisata', 'Kewirausahaan']],
  ['FHISIP', ['Ilmu Administrasi Publik', 'Administrasi Bisnis', 'Hukum', 'Ilmu Pemerintahan', 'Ilmu Komunikasi',
    'Perpustakaan dan Sains Informasi', 'Sosiologi', 'Sastra Inggris', 'Perpajakan']],
  ['FST', ['Statistika', 'Matematika', 'Biologi', 'Teknologi Pangan', 'Agribisnis', 'Perencanaan Wilayah dan Kota', 'Sistem Informasi', 'Sains Data']],
  ['Sekolah Vokasi', ['D3 Perpajakan', 'D4 Kearsipan']],
];
export const UPBJJ = ['Banda Aceh', 'Medan', 'Batam', 'Padang', 'Pangkalpinang', 'Pekanbaru', 'Jambi', 'Palembang', 'Bengkulu', 'Bandar Lampung',
  'Jakarta', 'Jakarta 2', 'Serang', 'Bogor', 'Bandung', 'Purwokerto', 'Semarang', 'Surakarta', 'Yogyakarta', 'Surabaya', 'Malang', 'Jember',
  'Denpasar', 'Mataram', 'Kupang', 'Pontianak', 'Palangka Raya', 'Banjarmasin', 'Samarinda', 'Makassar', 'Majene', 'Palu', 'Kendari',
  'Manado', 'Gorontalo', 'Ambon', 'Ternate', 'Jayapura', 'Sorong', 'Tarakan', 'Luar Negeri'];
