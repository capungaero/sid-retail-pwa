# SID Retail PWA

Modernisasi SID Retail untuk jaringan lokal minimarket. Frontend adalah React PWA yang keyboard-first; API dirancang sebagai Laravel REST API dengan adapter kompatibilitas skema SID.

## Menjalankan frontend

```powershell
npm install
npm run dev
```

Mode pengembangan menggunakan data demo lokal jika `VITE_API_URL` kosong. Transaksi demo hanya tersimpan di memori browser dan diberi label **Mode Demo**.

## Menjalankan API

PHP 8.3 dan Composer diperlukan (belum tersedia pada mesin saat scaffold dibuat).

```powershell
cd apps/api
Copy-Item .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

API tidak pernah mengakses MySQL lama. Atur `DB_*` hanya ke MariaDB hasil migrasi.

## Status

- Selesai: shell aplikasi, navigasi semua area, dashboard operasional, master barang CRUD, POS scan/pencarian, multi-satuan/harga, cart, pelanggan, hold/resume, pembayaran tunai, shortcut, receipt abstraction, PWA shell cache.
- Empat modul operasional (persediaan, keuangan, laporan, HRD) sudah lengkap: pembelian/retur/kartu stok, hutang/piutang/kas/instrumen, rekonsiliasi laporan lintas modul, serta jadwal shift/absensi/izin-sakit-cuti-lembur/rekap bulanan HRD.
- Pengaturan (modul terakhir) sudah lengkap: profil toko & struk (terhubung nyata ke pencetakan struk POS), pengguna & hak akses per peran (view only), konfigurasi printer thermal dengan tes cetak, serta backup simulasi & audit log.
- Kedelapan bagian sidebar (Ringkasan, Master Data, Transaksi, Persediaan, Keuangan, Laporan, HRD, Pengaturan) kini lengkap dan dapat dinavigasi end-to-end. Semuanya berjalan di mode demo/simulasi (data di memori browser), belum menulis ke MariaDB hasil migrasi.
- API contract: auth, barang, pelanggan, penjualan idempotent dan transaksional.

## Prinsip offline

Service worker hanya menyimpan app shell. Request API dan transaksi finansial tidak di-cache atau diantrekan. Saat offline, penyelesaian pembayaran dinonaktifkan.
