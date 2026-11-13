-- D1 "uji-ut" (akun Cloudflare Terangin, id 6e1df5c7-c3c2-4d1a-90f9-b74645a2cfbb).
-- Satu baris per responden per form. Isi lengkap (identitas, butir, tanda, jejak video, perangkat)
-- di kolom data (JSON) biar instrumen bisa berubah tanpa ganti skema; kolom lain buat daftar/saring cepat.
-- id dibikin browser (UUID acak 122 bit), jadi cuma pemegangnya yang bisa nyimpen ulang barisnya.
CREATE TABLE IF NOT EXISTS jawaban (
  id TEXT PRIMARY KEY,
  form TEXT NOT NULL,
  mulai TEXT NOT NULL,
  diubah TEXT NOT NULL,
  selesai TEXT,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jawaban_form ON jawaban (form, selesai);

-- Peneliti yang boleh buka laporan. forms = daftar kode form dipisah koma, atau '*' buat semua.
CREATE TABLE IF NOT EXISTS peneliti (
  email TEXT PRIMARY KEY,
  forms TEXT NOT NULL DEFAULT '*'
);

-- Kode masuk 6 angka lewat email. Yang disimpan cuma hash-nya.
CREATE TABLE IF NOT EXISTS kode_masuk (
  email TEXT NOT NULL,
  hash TEXT NOT NULL,
  kedaluwarsa INTEGER NOT NULL,
  coba INTEGER NOT NULL DEFAULT 0,
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS kode_masuk_email ON kode_masuk (email, dibuat);

-- Sesi peneliti setelah masuk. Token acak di cookie, di sini cuma hash-nya.
CREATE TABLE IF NOT EXISTS sesi (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  kedaluwarsa INTEGER NOT NULL
);
