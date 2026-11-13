# Kuesioner uji coba video UT (Nyalain /uji)

Form uji coba video pembelajaran buat dosen UT: consent, identitas, nonton video H5P, angket 25 butir,
catatan + tandai menit. Jasa pribadi user, tampil di domain Nyalain buat promosi nama. Keputusan dan
riwayat lengkap ada di `Desktop\h5p-player\CLAUDE.md` bagian "Kuesioner uji coba video UT".

## Peta lokasi (per 2026-11-13)

| Apa | Di mana |
|---|---|
| Kode form | folder ini = repo GitHub `terangin/formh5p`. Halaman `public/uji/`, Worker `src/worker.js` (API simpan), validasi `src/simpan.js` + `test/`. Deploy = push `main` lewat Workers Builds (Worker `formh5p` di akun Terangin, TAYANG 2026-11-13 malam setelah 2 build gagal kode 10013 waktu Workers degraded; preview builds mati). 13 Nov malam push ke main NGGAK mancing build (insiden Cloudflare "Workers changes not producing events"): picu manual di Builds → ⋯ → Retry build (ngambil HEAD main); kadang gagal 10013, ulang aja |
| Skema database | `skema.sql` (udah dijalanin di D1) |
| Database jawaban | Cloudflare D1 `uji-ut`, akun **Terangin** (tengahrambu@gmail.com, akun `f6fc9a7d05c10b4d6725ba37e5fa86da`), Asia Pacific, id `6e1df5c7-c3c2-4d1a-90f9-b74645a2cfbb`. Tabel: `jawaban`, `peneliti`, `kode_masuk`, `sesi` |
| Alamat form | `nyalain.kitaterangin.id/uji/<kode form>` (route Worker `nyalain.kitaterangin.id/uji*`; sisa domain tetap ke PocketBase rumah) |
| Turnstile | widget "Form uji coba UT (formh5p)" akun Terangin, hostname `nyalain.kitaterangin.id`, mode Managed, sitekey `0x4AAAAAAF_sduyu4pBaXMQZ`. Secret = secret Worker `TURNSTILE_SECRET` (diisi user sendiri). Dicek di langkah persetujuan (action `mulai-uji`), cuma waktu bikin baris baru |
| Kode form | `ut-tp` (TP, video tp1 + tp2, satu angket), `ut-bindo-1`, `ut-bindo-2` (Bahasa Indonesia, per materi), `ut-pai` (Pendidikan Agama Islam, video Lumi; dulu salah dikira Bahasa Arab) |
| Pemutar video | `https://h5p.wello.web.id/tonton?isi=<kode isi>`, repo `Desktop\h5p-player` → GitHub `buddywello-tech/h5p` → Cloudflare Pages `h5p`, akun **Wello** (buddy.wello@gmail.com, akun `c43749ed6a406f5ad6d213d55ec2fdad`). Push `main` = tayang |
| Isi video (h5p.json + content/) | R2 bucket `h5p-isi`, akun **Wello**, publik mati, dibaca lewat binding `ISI` di Pages `h5p` (Production) oleh `functions/isi-host/[[path]].js` |
| Library H5P | `Desktop\h5p-player\isi-lib\` (masuk repo) |
| Kode isi | `tp1-8a082ca8`, `tp2-3a0b90ab`, `bi1-67b38ac4`, `bi2-f51501ab`, `lumi-59763deb` |
| File .h5p asli | `~/Downloads/Arsip/`: `UT TP 1 (revisi 12 Nov).h5p`, `UT TP 2 (revisi 12 Nov).h5p`, `UT TP Bahasa Indonesia 1 (interaktif).h5p`, `UT TP Bahasa Indonesia 2 (interaktif).h5p`, `Lumi QBZaEN.h5p` |
| Asal video PAI | Lumi `app.lumi.education/run/QBZaEN`, unduh `app.lumi.education/api/v1/h5p/download/6a98006a8b7b9e18132f1e95` |
| Salinan isi lokal | `Desktop\h5p-player\isi-host\<kode isi>\` (gitignored). `Desktop\upload-r2-h5p\` = salinan buat upload, boleh dihapus |
| Instrumen dari peneliti | `~/Downloads/Instrumen Evaluasi Uji Coba Video Pembelajaran UT_ Mahasiswa (masukan Adning).docx` |

## Nambah atau ganti video

1. `node siapkan-isi.mjs <kode-isi> "file.h5p"` di `Desktop\h5p-player` (kode: huruf kecil + strip + 8 hex acak).
2. Commit + push `isi-lib/` kalau ada library baru.
3. Upload folder `isi-host/<kode-isi>/` ke bucket `h5p-isi` (drag foldernya, bukan induknya). File > 300 MB nggak bisa lewat dashboard.
4. Daftarin kodenya di `FORM` di `public/uji.js`.

## Coba lokal

```
node dev-server.mjs "C:/Users/Luthfi Perdana/Desktop/h5p-player" 8093
node dev-server.mjs "C:/Users/Luthfi Perdana/Desktop/uji-nyalain/public" 5500
```

Buka `http://localhost:5500/uji/ut-tp` (cuma tampilan, tanpa API). **Laporan peneliti (data CONTOH): `http://localhost:5500/uji/laporan.html`** (statistik deskriptif, % kelayakan, validitas r butir-total terkoreksi vs r tabel, Cronbach alpha, peta menit, profil, CSV mentah + olahan; logika di `public/uji/hitung.js` + `test/hitung.test.mjs`). Di situs asli belum aktif (nunggu login peneliti + API). Di sini muncul **bilah Mode dev** (pojok kanan atas): loncat ke langkah mana aja tanpa nonton habis/ngisi semua, reset, ganti form. Bilah ini cuma ada di localhost:5500.

Worker + API: `npx wrangler@4 d1 execute uji-ut --local --file skema.sql` sekali, lalu `npx wrangler@4 dev --local --port 5501`.
Mode `--local` nggak nyentuh akun mana pun. Video nggak muncul di sini karena CSP cuma ngizinin h5p.wello.web.id. Pemutar lokal cuma mau ngobrol (postMessage) sama induk di localhost
port 5500/5501/8090 (lihat `INDUK` di `tonton.js`). Data versi coba cuma di localStorage browser.

## Belum

Secret `TURNSTILE_SECRET` (user, setelah rotate karena secret lama sempat kebaca alat Claude), tes Turnstile asli + replay ditolak, halaman laporan peneliti (grafik ala Google Forms + CSV), email peneliti, isi placeholder
(tanggal hapus data, kontak peneliti, judul video Arab, kalimat promosi), event `selesai` belum dites,
tampilan HP belum dicek.
