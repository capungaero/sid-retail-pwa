# Legacy compatibility contract for API/UI

Target database: `sid_retail`. The migration preserves all original table and column names. The backend should isolate legacy SQL in repositories rather than exposing tables directly over HTTP.

Core tables:

- `barang`: product PK `kode`; description `nama`; barcode columns `kode_barcode` through `kode_barcode4`; units `satuan`, `satuan2` through `satuan4`; conversion factors `isi`, `isi2` through `isi4`; store stock `toko`, warehouse stock `gudang`; HPP `hpp`; store/wholesale/branch/other price families in `harga_toko*`, `harga_partai*`, `harga_cabang*`, `harga_lain*`.
- `pelanggan`: PK `kode`; `nama`, `alamat`, `saldo_piutang`, member pricing group `kdgrouphrg`.
- `karyawan`: PK `kode`; `nama`, `level`, legacy `password`, `phk`, `jammasuk`, `jamkeluar`. Authentication upgrade state belongs in `app_password_upgrades`.
- `penjualan`: PK `kode`; date/time `tanggal` + `jam`; customer `pelanggan`; totals `subtotal`, `diskon_rupiah`, `tax_rupiah`, `jumlah`, `bayar`, `kembali`, `piutang`; cashier `operator`/`kasir`; status flags remain varchar-compatible.
- `itempenjualan`: no legacy PK; target adds `app_row_id`; header reference `kode`; product `kode_barang`; `qty`, `harga`, `diskon`, `subtotal`, `hpp`, `isi`, and `lokasistok`.
- `pembelian`: PK `kode`; supplier `supplier`; totals `jumlah`, `hutang`; cash account `kode_kas`.
- `itempembelian`: no legacy PK; target adds `app_row_id`; header reference `kode`; product `kode_barang`; `qty`, `harga_beli`, `subtotal`, `isi`, `expired`.
- `kas`: PK `kode`; balance `saldo`.
- `hutang`, `piutang`: balance-event tables with `kode`, `tanggal`, and `jumlah`.
- `labarugi`: target adds `app_row_id`; `penjualan`, `hpp`, `diskon`, `labarugi`.

No standalone `stok`, `satuan`, or `harga` tables exist in the legacy database. Do not invent joins to them. New normalized application tables may be introduced later, but legacy import and reconciliation must remain authoritative until approved.

Writes that change sale header, sale items, stock, cash, receivable, and profit must be wrapped in one target InnoDB transaction. Invoice generation must use an atomic sequence; do not copy the legacy read-then-write `faktur_terakhir` pattern for concurrent users.
