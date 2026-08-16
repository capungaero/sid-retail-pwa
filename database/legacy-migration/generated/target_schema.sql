-- Generated from read-only SHOW CREATE TABLE; contains no row data.
SET NAMES utf8mb4;

CREATE TABLE `area` (
  `kode` varchar(50) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `atur_nota` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item` varchar(50) default NULL,
  `posisi` varchar(50) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auto_respon_custom` (
  `pesan` varchar(100) NOT NULL default '',
  `balasan` text,
  PRIMARY KEY  (`pesan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bank` (
  `kode` varchar(15) NOT NULL default '',
  `beban` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `barang` (
  `kode` varchar(25) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `kategori` varchar(50) default NULL,
  `golongan` varchar(50) default NULL,
  `subgolongan1` varchar(50) default NULL,
  `subgolongan2` varchar(50) default NULL,
  `satuanbeli` varchar(25) default 'PCS',
  `satuan` varchar(25) default 'PCS',
  `satuan2` varchar(25) default NULL,
  `satuan3` varchar(25) default NULL,
  `satuan4` varchar(25) default NULL,
  `isi` decimal(30,2) default '0.00',
  `isi2` decimal(30,2) default '1.00',
  `isi3` decimal(30,2) default '1.00',
  `isi4` decimal(30,2) default '1.00',
  `elektrik` varchar(5) default NULL,
  `sn` varchar(5) default NULL,
  `master` varchar(15) default NULL,
  `tr_saldo` varchar(5) default NULL,
  `nol_price` varchar(5) default NULL,
  `nol_price_diskon` varchar(5) default 'False',
  `toko` decimal(25,2) default '0.00',
  `gudang` decimal(30,2) default '0.00',
  `hpp` decimal(25,2) default '0.00',
  `harga_toko` decimal(25,2) default '0.00',
  `harga_toko2` decimal(30,2) default '0.00',
  `harga_toko3` decimal(30,2) default '0.00',
  `harga_toko4` decimal(30,2) default '0.00',
  `harga_partai` decimal(25,2) default '0.00',
  `harga_partai2` decimal(30,2) default '0.00',
  `harga_partai3` decimal(30,2) default '0.00',
  `harga_partai4` decimal(30,2) default '0.00',
  `harga_cabang` decimal(25,2) default '0.00',
  `harga_cabang2` decimal(30,2) default '0.00',
  `harga_cabang3` decimal(30,2) default '0.00',
  `harga_cabang4` decimal(30,2) default '0.00',
  `diskon` decimal(25,2) default '0.00',
  `point` decimal(25,2) default '0.00',
  `point_m` decimal(25,2) default '0.00',
  `jenis` varchar(25) default 'BARANG',
  `sinkron` varchar(5) default 'False',
  `stokmin` decimal(30,2) default '0.00',
  `jenis_point` varchar(10) default 'Standart',
  `point_k1` decimal(25,2) default '0.00',
  `point_k2` decimal(25,2) default '0.00',
  `gambar` varchar(200) default NULL,
  `harga_karyawan` decimal(30,2) default '0.00',
  `harga_member` decimal(30,2) default '0.00',
  `ukuran` varchar(15) default NULL,
  `kode_barcode` varchar(25) default NULL,
  `kode_barcode2` varchar(25) default NULL,
  `kode_barcode3` varchar(25) default NULL,
  `kode_barcode4` varchar(25) default NULL,
  `gambar2` varchar(200) default NULL,
  `margin_toko` decimal(18,2) default '0.00',
  `margin_toko2` decimal(30,2) default '0.00',
  `margin_toko3` decimal(30,2) default '0.00',
  `margin_toko4` decimal(30,2) default '0.00',
  `margin_partai` decimal(18,2) default '0.00',
  `margin_partai2` decimal(30,2) default '0.00',
  `margin_partai3` decimal(30,2) default '0.00',
  `margin_partai4` decimal(30,2) default '0.00',
  `margin_cabang` decimal(18,2) default '0.00',
  `margin_cabang2` decimal(30,2) default '0.00',
  `margin_cabang3` decimal(30,2) default '0.00',
  `margin_cabang4` decimal(30,2) default '0.00',
  `stokmax` decimal(30,2) default '0.00',
  `warningstok` decimal(30,2) default '0.00',
  `supplier` varchar(15) default NULL,
  `pajak` varchar(15) default NULL,
  `diskon2` decimal(30,2) default '0.00',
  `tgl_terakhir` date default NULL,
  `tampil` char(1) default '0',
  `diskon_beli` varchar(15) default '0',
  `warna` varchar(25) default NULL,
  `sudah_ppn` varchar(5) default 'False',
  `nilaippn` decimal(30,2) default '0.00',
  `expired` date default NULL,
  `ket` varchar(200) default NULL,
  `ada_expired_date` varchar(5) default 'False',
  `paket` varchar(5) default 'False',
  `diskon_toko` varchar(15) default '0',
  `diskon_partai` varchar(15) default '0',
  `diskon_cabang` varchar(15) default '0',
  `komisi_spg` varchar(5) default 'True',
  `lokasi` varchar(25) default NULL,
  `merk` varchar(15) default NULL,
  `cek` varchar(5) default 'False',
  `tipe_disc_member` varchar(15) default NULL,
  `jum_diskon_member` decimal(30,2) default '0.00',
  `jum_komisi_sales` decimal(30,2) default '0.00',
  `harga_terakhir` decimal(30,2) default '0.00',
  `keterangan_foto` varchar(35) default NULL,
  `nama2` varchar(50) default NULL,
  `nama3` varchar(50) default NULL,
  `nama4` varchar(50) default NULL,
  `toko_rusak` decimal(30,2) default '0.00',
  `gudang_rusak` decimal(30,2) default '0.00',
  `stokmin_gudang` decimal(30,2) default '0.00',
  `stokmax_gudang` decimal(30,2) default '0.00',
  `sisa_average` decimal(30,2) default '0.00',
  `harga_lain` decimal(30,2) default '0.00',
  `harga_lain2` decimal(30,2) default '0.00',
  `harga_lain3` decimal(30,2) default '0.00',
  `margin_lain` decimal(30,2) default '0.00',
  `margin_lain2` decimal(30,2) default '0.00',
  `margin_lain3` decimal(30,2) default '0.00',
  `margin_lain4` decimal(30,2) default '0.00',
  `harga_lain4` decimal(30,2) default '0.00',
  `diskon_lain` decimal(30,2) default '0.00',
  `stok_by_ukuran_warna` varchar(5) default 'False',
  `ket_tambahan` text,
  `item_description` text,
  `tampil_diwebsite` varchar(5) default 'False',
  `format_sms` varchar(35) default NULL,
  `no_hp_server` varchar(20) default NULL,
  PRIMARY KEY  (`kode`),
  KEY `kode_barcode` (`kode_barcode`),
  KEY `kode_barcode2` (`kode_barcode2`),
  KEY `kode_barcode3` (`kode_barcode3`),
  KEY `kode_barcode4` (`kode_barcode4`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `barang_diskon` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `operator` varchar(10) default 'Antara',
  `jum1` decimal(30,2) default '0.00',
  `jum2` decimal(30,2) default '0.00',
  `pilihan` varchar(20) default 'Harga',
  `nilai` decimal(30,2) default '0.00',
  `periode_mulai` date default NULL,
  `periode_sampai` date default NULL,
  `kode_barang` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  `harga` decimal(30,2) default '0.00',
  `nama_barang` varchar(50) default NULL,
  `ada_periode` varchar(5) default 'False',
  `diskon` decimal(30,2) default '0.00',
  `global` varchar(5) default 'False',
  `jenis_global` varchar(25) default 'Total Penjualan',
  `isi` int(3) default NULL,
  `satuan` varchar(25) default NULL,
  `cek` varchar(5) default 'False',
  `no` int(11) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bayarleasing` (
  `kode` varchar(50) NOT NULL default '',
  `tanggal` date default NULL,
  `kodepelanggan` varchar(50) default NULL,
  `namapelanggan` varchar(75) default NULL,
  `jumlahhutang` decimal(30,2) default '0.00',
  `admleasing` decimal(30,2) default '0.00',
  `panjar` decimal(30,2) default '0.00',
  `kodeleasing` varchar(50) default NULL,
  `namaleasing` varchar(75) default NULL,
  `status` varchar(50) default 'MENUNGGU',
  `kode_kas` varchar(15) default NULL,
  `petugas_survei` varchar(50) default NULL,
  `no_hp_petugas_survei` varchar(50) default NULL,
  `dp` decimal(30,2) default '0.00',
  `totalhutang` decimal(30,2) default '0.00',
  `lamapinjam` decimal(30,2) default '0.00',
  `angsuran` decimal(30,2) default '0.00',
  `tanggal_status` date default NULL,
  `jumlahbelanja` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `biaya` (
  `kode` varchar(15) NOT NULL default '',
  `nama` varchar(25) default NULL,
  `saldo` decimal(25,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cabang` (
  `kode` varchar(15) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `alamat` varchar(47) default NULL,
  `max_piutang` decimal(30,2) default '0.00',
  `saldo_piutang` decimal(30,2) default '0.00',
  `nonpwp` varchar(50) default NULL,
  `pelanggan_kena_pajak` varchar(5) default 'True',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `canvas` (
  `kode` varchar(25) NOT NULL default '',
  `kd_sales` varchar(25) default NULL,
  `nm_sales` varchar(50) default NULL,
  `tanggal` date default NULL,
  `tgl_plg` date default NULL,
  `tuj_area` varchar(25) default NULL,
  `no_kendaraan` varchar(25) default NULL,
  `jenis_kendaraan` varchar(35) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `operator` varchar(25) default NULL,
  `status` varchar(25) default 'Belum Berangkat',
  `supir` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `catatan_pesanan` (
  `nama_barang` varchar(50) default NULL,
  `pemesan` varchar(50) default NULL,
  `no_hp` varchar(50) default NULL,
  `kode` varchar(35) NOT NULL default '',
  `tanggal` date default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `detailjasa` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `qty` decimal(30,2) default '0.00',
  `satuan` varchar(15) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `diskon_pembelian_detail` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `no_faktur_beli` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `tipe_diskon` varchar(25) default NULL,
  `jumlah_diskon` decimal(30,2) default '0.00',
  `hasil_diskon` decimal(30,2) default '0.00',
  `nourut` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `err_sistem` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  `keterangan` varchar(200) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expired_barang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cek` varchar(5) default 'False',
  `kode_barang` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  `tgl_expired` date default NULL,
  `tgl_input` date default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `faktur_terakhir` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `faktur` varchar(25) default NULL,
  `tanggal` date default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `faktur_terakhir_canvas` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `faktur` varchar(25) default NULL,
  `tanggal` date default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `giroin` (
  `id` varchar(35) NOT NULL default '',
  `nomor` varchar(35) default NULL,
  `tanggal` date default NULL,
  `pelanggan` varchar(25) default NULL,
  `namapelanggan` varchar(35) default NULL,
  `alamatpelanggan` varchar(50) default NULL,
  `tipe` varchar(15) default 'GIRO',
  `jumlah` decimal(30,2) default '0.00',
  `cair` varchar(5) default 'False',
  `kode_kas` varchar(25) default NULL,
  `tanggalcair` date default NULL,
  `pembuat` varchar(50) default NULL,
  `penerima` varchar(50) default NULL,
  `keterangan` varchar(100) default NULL,
  `operator` varchar(25) default NULL,
  `nama_bank` varchar(25) default NULL,
  PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `giroout` (
  `id` varchar(35) NOT NULL default '',
  `nomor` varchar(35) default NULL,
  `tanggal` date default NULL,
  `supplier` varchar(25) default NULL,
  `namasupplier` varchar(35) default NULL,
  `alamatsupplier` varchar(50) default NULL,
  `tipe` varchar(15) default 'GIRO',
  `jumlah` decimal(30,2) default '0.00',
  `cair` varchar(5) default 'False',
  `kode_kas` varchar(25) default NULL,
  `tanggalcair` date default NULL,
  `pembuat` varchar(50) default NULL,
  `penerima` varchar(50) default NULL,
  `keterangan` varchar(100) default NULL,
  `operator` varchar(25) default NULL,
  `nama_bank` varchar(25) default NULL,
  `jenisnyadeposit` varchar(5) default 'False',
  `saldo_deposit_order` decimal(30,2) default '0.00',
  `no_urut` decimal(30,2) default '0.00',
  `saldo_deposit_order_sebenarnya` decimal(30,2) default '0.00',
  PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `glog` (
  `kd` varchar(100) NOT NULL default '',
  `tanggal` date default NULL,
  `jam` time default NULL,
  `tgljam` datetime default NULL,
  `add` varchar(100) default NULL,
  PRIMARY KEY  (`kd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `golongan` (
  `kategori` varchar(50) default NULL,
  `kode` varchar(50) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `golongan1` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kategori` varchar(50) default NULL,
  `golongan` varchar(50) default NULL,
  `kode` varchar(50) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `golongan2` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kategori` varchar(50) default NULL,
  `golongan` varchar(50) default NULL,
  `golongan1` varchar(50) default NULL,
  `kode` varchar(50) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `goodbs` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `tipe` int(1) default NULL,
  `operator` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `grouphrgpelanggan` (
  `kode` varchar(10) NOT NULL default '',
  `nama` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `grouphrgsupplier` (
  `kode` varchar(10) NOT NULL default '',
  `nama` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `header_return_penjualan` (
  `kode` varchar(25) NOT NULL default '',
  `jenispelanggan` varchar(25) default NULL,
  `tanggal` date default NULL,
  `pelanggan` varchar(200) default NULL,
  `namapelanggan` varchar(50) default NULL,
  `alamatpelanggan` varchar(200) default NULL,
  `kode_kas` varchar(25) default NULL,
  `operator` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `histori` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` datetime default NULL,
  `keterangan` varchar(200) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `historipoint` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kodemember` varchar(50) default NULL,
  `tanggal` date default NULL,
  `transaksi` varchar(50) default NULL,
  `no_faktur` varchar(25) default NULL,
  `debet` decimal(30,2) default '0.00',
  `kredit` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hrgpergroup` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kdgrouphrg` varchar(10) default NULL,
  `hrg_toko_1` decimal(30,2) default '0.00',
  `hrg_toko_2` decimal(30,2) default '0.00',
  `hrg_toko_3` decimal(30,2) default '0.00',
  `hrg_partai_1` decimal(30,2) default '0.00',
  `hrg_partai_2` decimal(30,2) default '0.00',
  `hrg_partai_3` decimal(30,2) default '0.00',
  `kodebarang` varchar(25) default NULL,
  KEY `kdgrouphrg` (`kdgrouphrg`),
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hrgpergroup_supplier` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kdgrouphrg` varchar(10) default NULL,
  `harga` decimal(30,2) default '0.00',
  `harga2` decimal(30,2) default '0.00',
  `harga3` decimal(30,2) default '0.00',
  `kodebarang` varchar(25) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hutang` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `supplier` varchar(25) default NULL,
  `alamat` varchar(50) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `kode_kas` varchar(25) default NULL,
  `ket` varchar(50) default NULL,
  `operator` varchar(25) default NULL,
  `pr` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `instansi` (
  `kode` varchar(50) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `internal_memo` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ket` text,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `item_barang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kdbuat` varchar(25) default NULL,
  `tglbuat` date default NULL,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(15) default NULL,
  `qty` decimal(30,2) default '0.00',
  `harga` decimal(30,2) default '0.00',
  `hpp` decimal(30,2) default '0.00',
  `harga_jual` decimal(30,2) default '0.00',
  KEY `kdbuat` (`kdbuat`),
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `item_jual_serial` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kd_jual` varchar(25) default NULL,
  `kd_barang` varchar(25) default NULL,
  `nomor_seri` varchar(50) default NULL,
  `transaksi` varchar(25) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `item_oks` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_type` varchar(50) default NULL,
  `nama` varchar(50) default NULL,
  `harga` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `item_supp_sales` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `supplier` varchar(25) default NULL,
  `nama_sales` varchar(50) default NULL,
  `alamat_sales` varchar(50) default NULL,
  `telp_sales` varchar(25) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `item_type` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(50) default NULL,
  `kode_barang` varchar(50) default NULL,
  `nama_barang` varchar(50) default NULL,
  `qty` decimal(30,2) default '0.00',
  `harga` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemcanvas` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(25) default NULL,
  `stok_real` decimal(30,2) default '0.00',
  `qty` decimal(30,2) default '0.00',
  `bale_no` varchar(25) default NULL,
  `sisa` decimal(30,2) default '0.00',
  `selisih` decimal(30,2) default '0.00',
  `lokasistok` varchar(5) default 'toko',
  `terjual` decimal(30,2) default '0.00',
  `isi` decimal(30,2) default '1.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemgiroin` (
  `id_giro` varchar(25) default NULL,
  `kode_piutang` varchar(25) default NULL,
  `tgl_piutang` date default NULL,
  `jum_piutang` decimal(30,2) default '0.00',
  `jum_bayar` decimal(30,2) default '0.00',
  `jum_return` decimal(30,2) default '0.00',
  `kode` varchar(50) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemgiroout` (
  `id_giro` varchar(25) default NULL,
  `kode_hutang` varchar(25) default NULL,
  `tgl_hutang` date default NULL,
  `jum_hutang` decimal(30,2) default '0.00',
  `jum_bayar` decimal(30,2) default '0.00',
  `jum_return` decimal(30,2) default '0.00',
  `kode` varchar(50) NOT NULL default '',
  `jumlah_pembayaran_asli` decimal(30,2) default '0.00',
  `tgl_pelunasan_deposit` date default NULL,
  `id_giro_pelunasan` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemgoodbs` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(15) default NULL,
  `qty` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemhutang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_hutang` varchar(25) default NULL,
  `tgl_hutang` date default NULL,
  `jumlah_hutang` decimal(30,2) default '0.00',
  `return` decimal(30,2) default '0.00',
  `jumlah` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemkoreksi` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(15) default NULL,
  `stok_lalu` decimal(30,2) default '0.00',
  `stok_kini` decimal(30,2) default '0.00',
  `alasan` varchar(25) default NULL,
  `selisih` decimal(30,2) default '0.00',
  `hpp` decimal(30,2) default '0.00',
  KEY `kode` (`kode`),
  KEY `kode_barang` (`kode_barang`),
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemmutasi` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itempembelian` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  `harga_beli` decimal(30,2) default '0.00',
  `harga_toko` decimal(30,2) default '0.00',
  `harga_cabang` decimal(30,2) default '0.00',
  `harga_partai` decimal(30,2) default '0.00',
  `subtotal` decimal(30,2) default '0.00',
  `isi` decimal(30,2) default '1.00',
  `qty_terima` decimal(30,2) default '0.00',
  `diskon` varchar(15) default '0',
  `expired` date default NULL,
  `diskon_toko` varchar(15) default '0',
  `diskon_partai` varchar(15) default '0',
  `diskon_cabang` varchar(15) default '0',
  `nourut` tinyint(4) default NULL,
  `harga_setelah_diskon` decimal(30,2) default '0.00',
  `stok_by_ukuran_warna` varchar(5) default 'False',
  `ukuran` varchar(25) default NULL,
  `warna` varchar(25) default NULL,
  KEY `kode` (`kode`),
  KEY `kode_barang` (`kode_barang`),
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itempengambilanbarang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `no_faktur` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `qty` decimal(30,2) default '0.00',
  `isi` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itempengiriman` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_faktur` varchar(25) default NULL,
  `kode_type` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itempengirimanpo` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_faktur` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itempenjualan` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nourut` tinyint(4) default '0',
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `kd_barang_paket` varchar(25) default NULL,
  `nama_barang` varchar(35) default NULL,
  `satuan` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  `harga` decimal(30,2) default '0.00',
  `diskon` varchar(15) default '0',
  `subtotal` decimal(30,2) default '0.00',
  `point` varchar(5) default NULL,
  `point_m` decimal(30,2) default '0.00',
  `barang_tambahan` varchar(5) default 'False',
  `ket_detail` varchar(15) default NULL,
  `saldo` decimal(30,2) default NULL,
  `hpp` decimal(30,2) default '0.00',
  `satuanbeli` varchar(5) default 'KECIL',
  `isi` decimal(30,2) default '1.00',
  `qty_terima` decimal(30,2) default '0.00',
  `ppn` varchar(5) default 'False',
  `diskon_rupiah` decimal(30,2) default '0.00',
  `jumlah_ppn` decimal(30,2) default '0.00',
  `no_po` varchar(25) default NULL,
  `expired` date DEFAULT NULL,
  `komisi_spg` varchar(5) default 'False',
  `posting` tinyint(3) default '-1',
  `detail_deb_cc` decimal(30,6) default '0.000000',
  `detail_disc_global` decimal(30,6) default '0.000000',
  `detail_tax` decimal(30,6) default '0.000000',
  `komisi_sales` decimal(30,2) default '0.00',
  `lokasistok` varchar(25) default NULL,
  `stok_by_ukuran_warna` varchar(5) default 'False',
  `ukuran` varchar(25) default NULL,
  `warna` varchar(25) default NULL,
  KEY `kode` (`kode`),
  KEY `kode_barang` (`kode_barang`),
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itempenjualan_paket` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(15) default NULL,
  `qty` decimal(30,2) default '0.00',
  `hpp` decimal(30,2) default '0.00',
  `harga_jual` decimal(30,2) default '0.00',
  `total` decimal(30,2) default '0.00',
  `kode_master` varchar(50) default NULL,
  `kode` varchar(25) default NULL,
  `tersimpan` varchar(5) default 'False',
  `lokasi` varchar(15) default 'TOKO',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itempiutang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_piutang` varchar(25) default NULL,
  `tgl_piutang` date default NULL,
  `jumlah_piutang` decimal(30,2) default '0.00',
  `return` decimal(30,2) default '0.00',
  `jumlah` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `itemproduksi` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(50) default NULL,
  `kode_type` varchar(50) default NULL,
  `nama_type` varchar(50) default NULL,
  `qty` decimal(30,2) default '0.00',
  `qtyselesai` decimal(30,2) default '0.00',
  `hargajual` decimal(30,2) default '0.00',
  `oksjahit` decimal(30,2) default '0.00',
  `denda` decimal(30,2) default '0.00',
  `subtotal` decimal(30,2) default '0.00',
  `mark` varchar(5) default 'False',
  `namapengirim` varchar(50) default NULL,
  `tanggalkirim` date default NULL,
  `kirimke` varchar(50) default NULL,
  `jasakirim` varchar(15) default NULL,
  `dikirim` varchar(5) default 'False',
  `biayakirim` decimal(30,2) default '0.00',
  `return` varchar(5) default 'False',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jenis_keperluan` (
  `kode` varchar(50) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kanvas` (
  `kode` varchar(25) NOT NULL default '',
  `kd_sales` varchar(25) default NULL,
  `nm_sales` varchar(50) default NULL,
  `tgl_brngkt` date default NULL,
  `tgl_plg` date default NULL,
  `tuj_area` varchar(25) default NULL,
  `no_kendaraan` varchar(25) default NULL,
  `jenis_kendaraan` varchar(35) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `operator` varchar(25) default NULL,
  `kembali` varchar(5) default 'False',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `karyawan` (
  `password` varchar(200) default NULL,
  `kode` varchar(40) NOT NULL default '',
  `nama` varchar(40) default NULL,
  `level` varchar(10) default NULL,
  `login_terakhir` varchar(50) default NULL,
  `copy_data` varchar(10) default NULL,
  `point` decimal(25,2) default '0.00',
  `phk` varchar(5) default NULL,
  `alamat` varchar(50) default NULL,
  `jenis` varchar(50) default NULL,
  `persen_shu` decimal(30,2) default '0.00',
  `jammasuk` time default NULL,
  `jamkeluar` time default NULL,
  `status` varchar(15) default NULL,
  `tanggal` date default NULL,
  `kasawal` decimal(30,2) default '0.00',
  `login_x` int(11) default NULL,
  `keterangan` varchar(50) default NULL,
  `divisi` varchar(25) default NULL,
  `spg` varchar(5) default 'False',
  `edit_qty_jual` varchar(5) default 'True',
  `pwd_del_trx` varchar(200) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kas` (
  `kode` varchar(25) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `saldo` decimal(30,2) default '0.00',
  `lap_l_r` varchar(5) default 'False',
  `default_toko` varchar(5) default 'False',
  `default_toko_read_only` varchar(5) default 'False',
  `default_partai` varchar(5) default 'False',
  `default_partai_read_only` varchar(5) default 'False',
  `default_cabang` varchar(5) default 'False',
  `default_cabang_read_only` varchar(5) default 'False',
  `default_return_pembelian` varchar(5) default 'False',
  `default_pembelian` varchar(5) default 'False',
  `default_pembelian_read_only` varchar(5) default 'False',
  `default_produksi` varchar(5) default 'False',
  `default_pengiriman_po` varchar(5) default 'False',
  `default_pengiriman_po_read_only` varchar(5) default 'False',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kas_awal` (
  `kode_kas` varchar(50) NOT NULL default '',
  `saldo` decimal(30,2) default '0.00',
  `tanggal` date default NULL,
  PRIMARY KEY  (`kode_kas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kasir` (
  `kode` varchar(15) NOT NULL default '',
  `nama` varchar(25) default NULL,
  `ip_address` varchar(15) default '000.000.000',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kaskaryawan` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pr` varchar(25) default NULL,
  `kodekas` varchar(25) default NULL,
  `saldo` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kategori` (
  `kode` varchar(50) NOT NULL default '',
  `point_member` varchar(5) default 'True',
  `diskon_global_persentase` decimal(30,2) default '0.00',
  `description` varchar(200) default NULL,
  `title` varchar(200) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kodeprocessed` (
  `kode` varchar(50) NOT NULL default '',
  `tanggal` date default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `komplain` (
  `kode` varchar(50) NOT NULL default '',
  `tanggal` date default NULL,
  `kode_pelanggan` varchar(25) default NULL,
  `nama_pelanggan` varchar(50) default NULL,
  `komplain` varchar(50) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kontribusianggota` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `kode_kas` varchar(15) default NULL,
  `operator` varchar(25) default NULL,
  `pelanggan` varchar(50) default NULL,
  `nama_pelanggan` varchar(50) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `koreksi` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `operator` varchar(25) default NULL,
  `lokasistok` varchar(10) default 'TOKO',
  `jenis` varchar(25) default 'KOREKSI STOK',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kota` (
  `kode` varchar(5) NOT NULL default '',
  `nama` varchar(15) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `labarugi` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(15) default NULL,
  `nama_barang` varchar(35) default NULL,
  `penjualan` decimal(30,2) default '0.00',
  `hpp` decimal(30,2) default '0.00',
  `diskon` decimal(30,2) default '0.00',
  `labarugi` decimal(30,2) default '0.00',
  `operator` varchar(25) default NULL,
  `keterangan` varchar(35) default NULL,
  `jt` decimal(20,2) default '0.00',
  `pelanggan` varchar(50) default NULL,
  `nama_pelanggan` varchar(50) default NULL,
  KEY `kode` (`kode`),
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `leasing` (
  `kode` varchar(25) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `alamat1` varchar(100) default NULL,
  `alamat2` varchar(100) default NULL,
  `telp` varchar(50) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `level` (
  `kode` varchar(5) NOT NULL default '',
  `nama` varchar(25) default NULL,
  `f_perusahaan` varchar(5) default 'True',
  `footer` varchar(5) default 'True',
  `f_level` varchar(5) default 'True',
  `insert_f_level` varchar(5) default 'True',
  `edit_f_level` varchar(5) default 'True',
  `hapus_f_level` varchar(5) default 'True',
  `f_karyawan` varchar(5) default 'True',
  `insert_f_karyawan` varchar(5) default 'True',
  `edit_f_karyawan` varchar(5) default 'True',
  `hapus_f_karyawan` varchar(5) default 'True',
  `f_kategori` varchar(5) default 'True',
  `insert_f_kategori` varchar(5) default 'True',
  `edit_f_kategori` varchar(5) default 'True',
  `hapus_f_kategori` varchar(5) default 'True',
  `f_master_barang_qty` varchar(5) default 'True',
  `insert_f_master_barang_qty` varchar(5) default 'True',
  `edit_f_master_barang_qty` varchar(5) default 'True',
  `hapus_f_master_barang_qty` varchar(5) default 'True',
  `f_master_cabang` varchar(5) default 'True',
  `insert_f_master_cabang` varchar(5) default 'True',
  `edit_f_master_cabang` varchar(5) default 'True',
  `hapus_f_master_cabang` varchar(5) default 'True',
  `f_master_pelanggan` varchar(5) default 'True',
  `insert_f_master_pelanggan` varchar(5) default 'True',
  `edit_f_master_pelanggan` varchar(5) default 'True',
  `hapus_f_master_pelanggan` varchar(5) default 'True',
  `f_master_supplier` varchar(5) default 'True',
  `insert_f_master_supplier` varchar(5) default 'True',
  `edit_f_master_supplier` varchar(5) default 'True',
  `hapus_f_master_supplier` varchar(5) default 'True',
  `f_master_biaya` varchar(5) default 'True',
  `insert_f_master_biaya` varchar(5) default 'True',
  `edit_f_master_biaya` varchar(5) default 'True',
  `hapus_f_master_biaya` varchar(5) default 'True',
  `f_master_kas` varchar(5) default 'True',
  `insert_f_master_kas` varchar(5) default 'True',
  `edit_f_master_kas` varchar(5) default 'True',
  `hapus_f_master_kas` varchar(5) default 'True',
  `f_member_card` varchar(5) default 'True',
  `insert_f_member_card` varchar(5) default 'True',
  `edit_f_member_card` varchar(5) default 'True',
  `hapus_f_member_card` varchar(5) default 'True',
  `f_koneksi` varchar(5) default 'True',
  `f_pembelian` varchar(5) default 'True',
  `insert_f_pembelian` varchar(5) default 'True',
  `edit_f_pembelian` varchar(5) default 'True',
  `hapus_f_pembelian` varchar(5) default 'True',
  `lihat_harga_f_pembelian` varchar(5) default 'False',
  `f_return_pembelian` varchar(5) default 'True',
  `insert_f_return_pembelian` varchar(5) default 'True',
  `edit_f_return_pembelian` varchar(5) default 'True',
  `hapus_f_return_pembelian` varchar(5) default 'True',
  `f_penerimaan_return` varchar(5) default 'True',
  `insert_f_penerimaan_return` varchar(5) default 'True',
  `edit_f_penerimaan_return` varchar(5) default 'True',
  `hapus_f_penerimaan_return` varchar(5) default 'True',
  `f_lap_pembelian_periode` varchar(5) default 'True',
  `f_lap_pembelian_barang` varchar(5) default 'True',
  `f_lap_pembelian_supplier` varchar(5) default 'True',
  `f_lap_saldo_stok` varchar(5) default 'True',
  `f_lap_stok_limit` varchar(5) default 'True',
  `f_lap_stok_over` varchar(5) default 'True',
  `f_lap_koreksi` varchar(5) default 'True',
  `f_lap_return_pembelian` varchar(5) default 'True',
  `f_lap_terima_return_pembelian` varchar(5) default 'True',
  `f_penjualan_toko` varchar(5) default 'True',
  `insert_f_penjualan_toko` varchar(5) default 'True',
  `edit_f_penjualan_toko` varchar(5) default 'True',
  `hapus_f_penjualan_toko` varchar(5) default 'True',
  `f_penjualan_partai` varchar(5) default 'True',
  `insert_f_penjualan_partai` varchar(5) default 'True',
  `edit_f_penjualan_partai` varchar(5) default 'True',
  `hapus_f_penjualan_partai` varchar(5) default 'True',
  `f_penjualan_cabang` varchar(5) default 'True',
  `insert_f_penjualan_cabang` varchar(5) default 'True',
  `edit_f_penjualan_cabang` varchar(5) default 'True',
  `hapus_f_penjualan_cabang` varchar(5) default 'True',
  `f_return_penjualan` varchar(5) default 'True',
  `insert_f_return_penjualan` varchar(5) default 'True',
  `edit_f_return_penjualan` varchar(5) default 'True',
  `hapus_f_return_penjualan` varchar(5) default 'True',
  `f_tukar_tambah` varchar(5) default 'True',
  `insert_f_tukar_tambah` varchar(5) default 'True',
  `edit_f_tukar_tambah` varchar(5) default 'True',
  `hapus_f_tukar_tambah` varchar(5) default 'True',
  `f_lap_penjualan_periode` varchar(5) default 'True',
  `f_lap_penjualan_barang` varchar(5) default 'True',
  `f_lap_penjualan_pelanggan` varchar(5) default 'True',
  `f_lap_penjualan_member` varchar(5) default 'True',
  `f_lap_penjualan_cabang` varchar(5) default 'True',
  `f_lap_penjualan_kategori` varchar(5) default 'True',
  `f_lap_return_penjualan` varchar(5) default 'True',
  `f_lap_point` varchar(5) default 'True',
  `f_lap_point_member` varchar(5) default 'True',
  `f_pengeluaran` varchar(5) default 'True',
  `insert_f_pengeluaran` varchar(5) default 'True',
  `edit_f_pengeluaran` varchar(5) default 'True',
  `hapus_f_pengeluaran` varchar(5) default 'True',
  `f_bayar_hutang` varchar(5) default 'True',
  `insert_f_bayar_hutang` varchar(5) default 'True',
  `edit_f_bayar_hutang` varchar(5) default 'True',
  `hapus_f_bayar_hutang` varchar(5) default 'True',
  `f_bayar_piutang` varchar(5) default 'True',
  `insert_f_bayar_piutang` varchar(5) default 'True',
  `edit_f_bayar_piutang` varchar(5) default 'True',
  `hapus_f_bayar_piutang` varchar(5) default 'True',
  `f_mutasi_kas` varchar(5) default 'True',
  `insert_f_mutasi_kas` varchar(5) default 'True',
  `edit_f_mutasi_kas` varchar(5) default 'True',
  `hapus_f_mutasi_kas` varchar(5) default 'True',
  `f_penyesuaian_stok` varchar(5) default 'True',
  `insert_f_penyesuaian_stok` varchar(5) default 'True',
  `edit_f_penyesuaian_stok` varchar(5) default 'True',
  `hapus_f_penyesuaian_stok` varchar(5) default 'True',
  `f_tukar_point` varchar(5) default 'True',
  `insert_f_tukar_point` varchar(5) default 'True',
  `edit_f_tukar_point` varchar(5) default 'True',
  `hapus_f_tukar_point` varchar(5) default 'True',
  `f_lap_biaya_pengeluaran` varchar(5) default 'True',
  `f_lap_pengeluaran_jenis` varchar(5) default 'True',
  `f_lap_mutasi` varchar(5) default 'True',
  `f_lap_hutang_periode` varchar(5) default 'True',
  `f_lap_piutang_pelanggan` varchar(5) default 'True',
  `f_lap_hutang_supplier` varchar(5) default 'True',
  `f_lap_hutang_ke` varchar(5) default 'True',
  `f_lap_piutang_periode` varchar(5) default 'True',
  `f_lap_piutang_ke` varchar(5) default 'True',
  `f_lap_buku_kas` varchar(5) default 'True',
  `f_lap_laba_rugi` varchar(5) default 'True',
  `f_lap_hutang_jatuh_tempo` varchar(5) default 'True',
  `f_lap_piutang_jatuh_tempo` varchar(5) default 'True',
  `f_lap_mutasi_hutang_piutang` varchar(5) default 'True',
  `f_optimize_database` varchar(5) default 'True',
  `f_remove_transaksi` varchar(5) default 'True',
  `f_reset_point_member` varchar(5) default 'True',
  `f_ganti_password` varchar(5) default 'True',
  `f_histori` varchar(5) default 'True',
  `f_master_pajak` varchar(5) default 'True',
  `insert_f_master_pajak` varchar(5) default 'True',
  `edit_f_master_pajak` varchar(5) default 'True',
  `hapus_f_master_pajak` varchar(5) default 'True',
  `f_pengirimanpo` varchar(5) default 'True',
  `insert_f_pengirimanpo` varchar(5) default 'True',
  `edit_f_pengirimanpo` varchar(5) default 'True',
  `hapus_f_pengirimanpo` varchar(5) default 'True',
  `f_lap_price_list` varchar(5) default 'True',
  `f_lap_kartu_stok` varchar(5) default 'True',
  `lihathpp` varchar(5) default 'True',
  `f_lap_penjualan_kasir` varchar(5) default 'True',
  `f_karyawan_aktiv` varchar(5) default 'True',
  `f_lap_stok_kategori_total` varchar(5) default 'True',
  `f_lap_stok_bs` varchar(5) default 'True',
  `f_lap_penjualan_omset` varchar(5) default 'True',
  `f_lap_pembulatan` varchar(5) default 'True',
  `f_lap_harian_kas` varchar(5) default 'True',
  `f_lap_komisi_spg` varchar(5) default 'True',
  `f_lap_stok_opname` varchar(5) default 'True',
  `f_lap_shu` varchar(5) default 'True',
  `f_lap_analisa_piutang` varchar(5) default 'True',
  `f_fast_slow` varchar(5) default 'True',
  `f_lap_penjualan_card` varchar(5) default 'True',
  `editqtyjual` varchar(5) default 'True',
  `f_lap_stok_kadaluarsa` varchar(5) default 'True',
  `cl_f_master_barang_qty` varchar(5) default 'True',
  `f_lap_penjualan_bykasir` varchar(5) default 'True',
  `f_lap_penjualan_perjam` varchar(5) default 'True',
  `ed_st_f_master_barang` varchar(5) default 'True',
  `f_lap_penjualan_sales` varchar(5) default 'True',
  `lihathargajual` varchar(5) default 'True',
  `f_pemasukan` varchar(5) default 'True',
  `insert_f_pemasukan` varchar(5) default 'True',
  `edit_f_pemasukan` varchar(5) default 'True',
  `hapus_f_pemasukan` varchar(5) default 'True',
  `f_lap_stok_minus` varchar(5) default 'True',
  `f_lap_histori_hutang` varchar(5) default 'True',
  `f_lap_histori_piutang` varchar(5) default 'True',
  `edittgljual` varchar(5) default 'True',
  `f_pemakaian_barang` varchar(5) default 'True',
  `insert_f_pemakaian_barang` varchar(5) default 'True',
  `edit_f_pemakaian_barang` varchar(5) default 'True',
  `hapus_f_pemakaian_barang` varchar(5) default 'True',
  `f_grafik_penjualan` varchar(5) default 'True',
  `f_grafik_laba` varchar(5) default 'True',
  `boleh_lihat_stok_kasir` varchar(5) default 'True',
  `f_canvas` varchar(5) default 'True',
  `insert_f_canvas` varchar(5) default 'True',
  `edit_f_canvas` varchar(5) default 'True',
  `hapus_f_canvas` varchar(5) default 'True',
  `lihatmarginbarang` varchar(5) default 'True',
  `lihatsuppliermasterbarang` varchar(5) default 'True',
  `edit_no_faktur` varchar(5) default 'True',
  `f_opsi_transaksi_beli` varchar(5) default 'True',
  `f_opsi_transaksi_jual_toko` varchar(5) default 'True',
  `f_opsi_transaksi_jual_partai` varchar(5) default 'True',
  `f_opsi_transaksi_jual_cabang` varchar(5) default 'True',
  `f_lap_penjualan_supplier` varchar(5) default 'True',
  `f_lap_penjualan_shift` varchar(5) default 'True',
  `option_karyawan` varchar(5) default 'False',
  `f_lap_pemakaian_barang` varchar(5) default 'True',
  `atur_f_master_barang` varchar(5) default 'False',
  `f_mutasi_stok` varchar(5) default 'True',
  `insert_f_mutasi_stok` varchar(5) default 'True',
  `edit_f_mutasi_stok` varchar(5) default 'True',
  `hapus_f_mutasi_stok` varchar(5) default 'True',
  `f_mutasi_barang` varchar(5) default 'True',
  `insert_f_mutasi_barang` varchar(5) default 'True',
  `edit_f_mutasi_barang` varchar(5) default 'True',
  `hapus_f_mutasi_barang` varchar(5) default 'True',
  `f_jual_tahan` varchar(5) default 'True',
  `boleh_lihat_modal_jual` varchar(5) default 'False',
  `cetak_nota_f9` varchar(5) default 'True',
  `boleh_edit_harga_saat_beli` varchar(5) default 'True',
  `editqtyjual_negatif` varchar(5) default 'False',
  `lihatstokbarang` varchar(5) default 'True',
  `f_giro_in` varchar(5) default 'True',
  `insert_f_giro_in` varchar(5) default 'True',
  `edit_f_giro_in` varchar(5) default 'True',
  `hapus_f_giro_in` varchar(5) default 'True',
  `cairkan_f_giro_in` varchar(5) default 'True',
  `f_giro_out` varchar(5) default 'True',
  `insert_f_giro_out` varchar(5) default 'True',
  `edit_f_giro_out` varchar(5) default 'True',
  `hapus_f_giro_out` varchar(5) default 'True',
  `cairkan_f_giro_out` varchar(5) default 'True',
  `f_laporan_giro` varchar(5) default 'True',
  `delete_jual_via_password` varchar(5) default 'False',
  `f_lap_faktur_pajak` varchar(5) default 'True',
  `klik_kanan_semua_barang` varchar(5) default 'True',
  `klik_kanan_semua_pelanggan` varchar(5) default 'True',
  `f_lap_tarik_penjualan` varchar(5) default 'True',
  `hidden_harga_saat_pembelian` varchar(5) default 'False',
  `f_lap_tagihan_harian_pelanggan` varchar(5) default 'True',
  `f_lap_tagihan_harian_sales` varchar(5) default 'True',
  `tampilan_stok_mst_brg` varchar(40) default 'Default',
  `boleh_lihat_modal_jual_2` varchar(5) default 'True',
  `edit_jum_point_member` varchar(5) default 'False',
  `pilih_penjualan_dikasir` varchar(5) default 'True',
  `form_kasir_otomatis` varchar(5) default 'False',
  `lihat_saldo_kas_piutang_pengeluaran` varchar(5) default 'True',
  `boleh_cetak_ulang_nota` varchar(5) default 'True',
  `boleh_edit_tgl_piutang` varchar(5) default 'True',
  `hanya_surat_jalan_ulang` varchar(5) default 'False',
  `edit_f_penjualan_lain` varchar(5) default 'True',
  `hapus_f_penjualan_lain` varchar(5) default 'True',
  `f_opsi_f_penjualan_lain` varchar(5) default 'True',
  `f_penjualan_lain` varchar(5) default 'True',
  `insert_f_penjualan_lain` varchar(5) default 'True',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `level2` (
  `kode` varchar(5) NOT NULL default '',
  `stok_akhir_sisa_penjualan` varchar(5) default 'True',
  `f_lap_pengeluaran_dotmatrix` varchar(5) default 'True',
  `f_lap_penjualan_member` varchar(5) default 'True',
  `f_lap_penjualan_supplier_barang` varchar(5) default 'True',
  `f_lap_penjualan_supplier_pelanggan` varchar(5) default 'True',
  `f_lap_penjualan_barang_pelanggan` varchar(5) default 'True',
  `f_lap_jual_beli` varchar(5) default 'True',
  `f_lap_penjualan_kategori_vs_pelanggan` varchar(5) default 'True',
  `f_lap_cashback_pelanggan` varchar(5) default 'True',
  `f_lap_kontribusi_anggota` varchar(5) default 'True',
  `f_webreport` varchar(5) default 'True',
  `tampilkan_hrga_jual_terakhir_pelanggan` varchar(5) default 'False',
  `f_lap_deposit_giro` varchar(5) default 'True',
  `gunakan_harga_akhir` varchar(5) default 'False',
  `kasir_hanya_cari_kode` varchar(5) default 'False',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `level_harga_toko_1` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_barang` varchar(15) default NULL,
  `level` tinyint(4) default NULL,
  `harga` decimal(30,2) default '0.00',
  `satuan` varchar(25) default NULL,
  `isi` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loginkaryawan` (
  `tanggal_login` date default NULL,
  `tanggal_logout` date default NULL,
  `jam_login` time default NULL,
  `jam_logout` time default NULL,
  `kodekaryawan` varchar(25) default NULL,
  `shif` varchar(4) default '1',
  `pr` varchar(25) NOT NULL default '',
  `hos` varchar(35) default NULL,
  `tampil` varchar(5) default 'False',
  `kasawal` decimal(30,2) default '0.00',
  `operatorbefore` varchar(25) default NULL,
  `status` varchar(15) default NULL,
  `kasakhir` decimal(30,2) default '0.00',
  `prbefore` varchar(25) default NULL,
  PRIMARY KEY  (`pr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loginterakhir` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  `jam` time default NULL,
  `kodekaryawan` varchar(25) default NULL,
  `shif` varchar(4) default '1',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lokasi` (
  `kode` varchar(25) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `member` (
  `nama` varchar(50) default NULL,
  `alamat` varchar(47) default NULL,
  `tgl_lahir` date default NULL,
  `agama` varchar(15) default NULL,
  `pekerjaan` varchar(15) default NULL,
  `jenis_id` varchar(15) default NULL,
  `no_id` varchar(25) default NULL,
  `no_telp` varchar(15) default NULL,
  `id_kartu` varchar(200) NOT NULL default '',
  `no_kartu` varchar(25) default NULL,
  `area` varchar(10) default NULL,
  `expired` date default NULL,
  `point` decimal(25,2) default '0.00',
  `saldo_piutang` decimal(25,2) default '0.00',
  `komisi` decimal(25,2) default '0.00',
  `max_piutang` decimal(25,2) unsigned default '0.00',
  `email` varchar(25) default NULL,
  `tampil` varchar(5) default 'False',
  `sisa` decimal(30,2) default '0.00',
  `referal` varchar(35) default NULL,
  `pelanggan_kena_pajak` varchar(5) default 'True',
  `nonpwp` varchar(50) default NULL,
  PRIMARY KEY  (`id_kartu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mlog` (
  `asd` varchar(50) NOT NULL default '',
  PRIMARY KEY  (`asd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mutasibarang` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `dari` varchar(50) default NULL,
  `ke` varchar(50) default NULL,
  `keterangan` varchar(50) default NULL,
  `operator` varchar(15) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mutasikas` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `debet` varchar(25) default NULL,
  `kredit` varchar(25) default NULL,
  `keterangan` varchar(50) default NULL,
  `rupiah` decimal(30,2) default '0.00',
  `operator` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `nomor_seri` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `no_faktur` varchar(13) default NULL,
  `kd_barang` varchar(15) default NULL,
  `nomor_seri` varchar(50) default NULL,
  `transaksi` varchar(15) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pajak` (
  `kode` varchar(25) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `keterangan` varchar(100) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pelanggan` (
  `kode` varchar(15) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `alamat` varchar(47) default NULL,
  `max_piutang` decimal(30,2) default '0.00',
  `saldo_piutang` decimal(30,2) default '0.00',
  `password` varchar(50) default NULL,
  `area` varchar(50) default NULL,
  `instansi` varchar(50) default NULL,
  `tampil` varchar(5) default 'False',
  `telp` varchar(15) default NULL,
  `tgl_lahir` date default NULL,
  `pekerjaan` varchar(15) default NULL,
  `email` varchar(25) default NULL,
  `tgllahir` date default NULL,
  `foto` varchar(200) default NULL,
  `kota` varchar(5) default NULL,
  `rayon` varchar(5) default NULL,
  `diskn_penjualan` decimal(30,2) default '0.00',
  `persen_shu` decimal(30,2) default '0.00',
  `sales` varchar(25) default 'UMUM',
  `nonpwp` varchar(35) default NULL,
  `nofax` varchar(25) default NULL,
  `kdgrouphrg` varchar(10) default NULL,
  `nama_toko` varchar(50) default NULL,
  `saldo_tabungan` decimal(30,2) default '0.00',
  `pelanggan_kena_pajak` varchar(5) default 'True',
  `blokir_piutang_hari` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pemasukan` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `kd_biaya` varchar(25) default NULL,
  `keterangan` varchar(100) default NULL,
  `kode_kas` varchar(25) default NULL,
  `jumlah` decimal(25,2) default '0.00',
  `operator` varchar(50) default NULL,
  `pr` varchar(25) default NULL,
  `kode_pelanggan` varchar(50) default NULL,
  `nama_pelanggan` varchar(50) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pembayaran_angsuran` (
  `kode` varchar(35) NOT NULL default '',
  `tanggal` date default NULL,
  `angsuran_ke` int(11) default '0',
  `kode_pelanggan` varchar(15) default NULL,
  `kode_faktur` varchar(25) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pembelian` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `supplier` varchar(15) default NULL,
  `kode_kas` varchar(15) default NULL,
  `keterangan` varchar(50) default NULL,
  `diskon` decimal(30,2) default '0.00',
  `tax` decimal(30,2) default '0.00',
  `jumlah` decimal(30,2) default '0.00',
  `operator` varchar(15) default NULL,
  `jt` decimal(30,2) default '0.00',
  `lunas` varchar(5) default NULL,
  `visa` varchar(15) default NULL,
  `nomor_visa` varchar(25) default NULL,
  `nama_visa` varchar(25) default NULL,
  `hutang` decimal(30,2) default '0.00',
  `po` varchar(5) default 'False',
  `receive` varchar(5) default 'True',
  `jasakirim` varchar(50) default NULL,
  `biayakirim` decimal(30,2) default '0.00',
  `lokasistok` varchar(10) default 'toko',
  `pr` varchar(25) default NULL,
  `kode_deposit_giro` varchar(15) default NULL,
  `count_dep_giro` decimal(30,2) default '0.00',
  `kekurangan_deposit` decimal(30,2) default '0.00',
  `penggunaan_deposit` decimal(30,2) default '0.00',
  `kekurangan_sdh_dibayar` varchar(5) default 'False',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `penerimaan_return` (
  `kode` varchar(15) NOT NULL default '',
  `tanggal` date default NULL,
  `kode_barang` varchar(15) default NULL,
  `nama_barang` varchar(25) default NULL,
  `satuan` varchar(15) default NULL,
  `kode_return` varchar(15) default NULL,
  `tanggal_return` date default NULL,
  `sn_lama` varchar(25) default NULL,
  `qty_terima` decimal(25,2) default NULL,
  `harga` decimal(25,2) default NULL,
  `jumlah` decimal(25,2) default NULL,
  `ket` varchar(50) default NULL,
  `sn_baru` varchar(25) default NULL,
  `operator` varchar(25) default NULL,
  `lokasistok` varchar(10) default 'toko',
  `kode_kas` varchar(25) default NULL,
  `stok_by_ukuran_warna` varchar(5) default 'False',
  `ukuran` varchar(25) default NULL,
  `warna` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pengambilanbarang` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `operator` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pengeluaran` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `kd_biaya` varchar(25) default NULL,
  `keterangan` varchar(50) default NULL,
  `kode_kas` varchar(25) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `operator` varchar(50) default NULL,
  `pr` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pengiriman` (
  `kode` varchar(50) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pengirimanpo` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `pelanggan` varchar(25) default NULL,
  `jasakirim` varchar(15) default NULL,
  `biayakirim` decimal(30,2) default '0.00',
  `namapengirim` varchar(25) default NULL,
  `alamatpengirim` varchar(50) default NULL,
  `namapenerima` varchar(25) default NULL,
  `alamatpenerima` varchar(50) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pengirimanproduksi` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `pelanggan` varchar(25) default NULL,
  `jasakirim` varchar(15) default NULL,
  `biayakirim` decimal(30,2) default '0.00',
  `namapengirim` varchar(25) default NULL,
  `alamatpengirim` varchar(50) default NULL,
  `namapenerima` varchar(25) default NULL,
  `alamatpenerima` varchar(50) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `penjualan` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `pelanggan` varchar(200) default NULL,
  `nama_pelanggan` varchar(50) default 'Tanpa Nama',
  `alamat_pelanggan` varchar(200) default 'Tanpa Alamat',
  `member` varchar(5) default 'False',
  `kode_kas` varchar(15) default NULL,
  `keterangan` varchar(50) default NULL,
  `angsuran` int(11) default '0',
  `subtotal` decimal(30,2) default '0.00',
  `diskon` varchar(25) default '0',
  `diskon_rupiah` decimal(30,2) default '0.00',
  `tax` varchar(25) default '0',
  `tax_rupiah` decimal(30,2) default '0.00',
  `jumlah` decimal(30,2) default '0.00',
  `bayar` decimal(30,2) default '0.00',
  `kembali` decimal(30,2) default '0.00',
  `operator` varchar(50) default NULL,
  `point_penjualan` decimal(30,2) default '0.00',
  `jt` decimal(30,2) default '0.00',
  `lunas` varchar(5) default NULL,
  `visa` varchar(15) default NULL,
  `nomor_visa` varchar(25) default NULL,
  `nama_visa` varchar(25) default NULL,
  `jenis` varchar(25) default NULL,
  `piutang` decimal(30,2) default '0.00',
  `po` varchar(5) default 'False',
  `receive` varchar(5) default 'False',
  `jasakirim` varchar(50) default NULL,
  `biayakirim` decimal(30,2) default '0.00',
  `pelanggan_visa` varchar(25) default NULL,
  `kasir` varchar(25) default NULL,
  `tahan` varchar(5) default 'False',
  `status` varchar(25) default 'BELUM DIKIRIM',
  `spg` varchar(25) default NULL,
  `jam` time default NULL,
  `pembulatan` decimal(30,2) default '0.00',
  `status_pengiriman` varchar(15) default 'PENDING',
  `card` decimal(30,2) default '0.00',
  `card_rupiah` decimal(30,2) default '0.00',
  `cashout` decimal(30,2) default '0.00',
  `sales` varchar(25) default NULL,
  `shif` varchar(4) default '1',
  `pr` varchar(25) default 'BEBAS',
  `dicetak` varchar(5) default 'True',
  `hrg_termasuk_pajak` varchar(5) default 'False',
  `no_faktur_pajak` varchar(50) default NULL,
  `pajak_jumhrgjual` decimal(30,2) default '0.00',
  `pajak_jumpotongan` decimal(30,2) default '0.00',
  `pajak_totdpp` decimal(30,2) default '0.00',
  `pajak_jumpajak` decimal(30,2) default '0.00',
  `trx_vcr` varchar(5) default 'False',
  `kd_vcr` varchar(50) default NULL,
  `jum_vcr` decimal(30,2) default '0.00',
  `bayar_instansi_kode` varchar(50) default NULL,
  `bayar_instansi_sejumlah` decimal(30,2) default '0.00',
  `kode_pemasukan` varchar(25) default NULL,
  `bunga_angs_rp` decimal(30,2) default '0.00',
  `bunga_angs` decimal(30,2) default '0.00',
  `masuk_tabungan` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pesan` (
  `kode` decimal(30,0) NOT NULL default '0',
  `tanggal` date default NULL,
  `jam` time default NULL,
  `pengirim` varchar(50) default NULL,
  `penerima` varchar(50) default NULL,
  `isi` varchar(200) default NULL,
  `terkirim_dibaca` varchar(5) default 'False',
  `jenis` varchar(15) default 'OUTBOX',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `phonebook` (
  `telp` varchar(50) NOT NULL default '',
  `nama` varchar(35) default NULL,
  PRIMARY KEY  (`telp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pin_sambungan` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pin` varchar(25) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `piutang` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `pelanggan` varchar(100) default NULL,
  `alamat` varchar(50) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `kode_kas` varchar(25) default NULL,
  `ket` varchar(50) default NULL,
  `operator` varchar(25) default NULL,
  `member` varchar(5) default 'False',
  `cabang` varchar(5) default 'False',
  `pr` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `postingtrx` (
  `kode` int(10) unsigned NOT NULL default '0',
  `trx` tinyint(4) NOT NULL default '0',
  `kodeasli` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `produksi` (
  `kode` varchar(50) NOT NULL default '',
  `tanggal` date default NULL,
  `keterangan` varchar(50) default NULL,
  `dp` decimal(30,2) default '0.00',
  `kode_kas` varchar(50) default NULL,
  `jenispelanggan` varchar(50) default 'PERORANGAN',
  `pelanggan` varchar(50) default NULL,
  `jasakirim` varchar(50) default NULL,
  `biayakirim` varchar(50) default NULL,
  `operator` varchar(50) default NULL,
  `receive` varchar(5) default 'False',
  `tukangjahit` varchar(50) default NULL,
  `status` varchar(50) default NULL,
  `tglhrsselesai` date default NULL,
  `tglselesai` date default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `denda` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `range_point` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dari` decimal(25,2) default '0.00',
  `sampai` decimal(25,2) default '0.00',
  `komisi` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rayon` (
  `kode` varchar(5) NOT NULL default '',
  `nama` varchar(15) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `request` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `request_faktur_penjualan` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(50) default NULL,
  `tanggal` date default NULL,
  `operator` varchar(50) default NULL,
  `hid` varchar(50) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `return_pembelian` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(15) default NULL,
  `no_faktur` varchar(25) default NULL,
  `tgl_beli` date default NULL,
  `supplier` varchar(15) default NULL,
  `sn` varchar(25) default NULL,
  `qty` decimal(25,2) default '0.00',
  `harga` decimal(25,2) default '0.00',
  `jumlah` decimal(25,2) default NULL,
  `alasan` varchar(50) default NULL,
  `kode_kas` varchar(25) default NULL,
  `operator` varchar(15) default NULL,
  `kembali` varchar(5) default 'False',
  `lokasistok` varchar(10) default 'toko',
  `stok_by_ukuran_warna` varchar(5) default 'False',
  `ukuran` varchar(25) default NULL,
  `warna` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `return_penjualan` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `jenis_penjualan` varchar(25) default NULL,
  `no_faktur` varchar(15) default NULL,
  `tgl_jual` date default NULL,
  `kode_barang` varchar(15) default NULL,
  `nama_barang` varchar(25) default NULL,
  `satuan` varchar(15) default NULL,
  `sn` varchar(25) default NULL,
  `qty` decimal(25,2) default '0.00',
  `harga` decimal(25,2) default '0.00',
  `diskon` decimal(25,2) default '0.00',
  `jumlah` decimal(25,2) default '0.00',
  `alasan` varchar(50) default NULL,
  `kode_kas` varchar(25) default NULL,
  `operator` varchar(15) default NULL,
  `hpp` decimal(30,2) default '0.00',
  `pr` varchar(25) default NULL,
  `tipe` varchar(25) default NULL,
  `kode_header` varchar(25) default NULL,
  `lokasistok` varchar(25) default 'toko',
  `isi` decimal(30,2) default '1.00',
  `stok_by_ukuran_warna` varchar(5) default 'False',
  `ukuran` varchar(25) default NULL,
  `warna` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sales` (
  `kode` varchar(25) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `alamat` varchar(100) default NULL,
  `telp` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sales_supplier` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama` varchar(25) default NULL,
  `telp` varchar(25) default NULL,
  `kode_supplier` varchar(25) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `satuanbeli` (
  `nama` varchar(25) NOT NULL default '',
  PRIMARY KEY  (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `satuanjual` (
  `nama` varchar(25) NOT NULL default '',
  PRIMARY KEY  (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `set_point_member` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `jumlah1` decimal(30,2) default '0.00',
  `point1` decimal(30,2) default '0.00',
  `jumlah2` decimal(30,2) default '0.00',
  `point2` decimal(30,2) default '0.00',
  `jumlah3` decimal(30,2) default '0.00',
  `point3` decimal(30,2) default '0.00',
  `jumlah4` decimal(30,2) default '0.00',
  `point4` decimal(30,2) default '0.00',
  `jumlah5` decimal(30,2) default '0.00',
  `point5` decimal(30,2) default '0.00',
  `jumlah6` decimal(30,2) default '0.00',
  `point6` decimal(30,2) default '0.00',
  `jumlah7` decimal(30,2) default '0.00',
  `point7` decimal(30,2) default '0.00',
  `jumlah8` decimal(30,2) default '0.00',
  `point8` decimal(30,2) default '0.00',
  `berlakukelipatan` varchar(5) default 'False',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `setup_perusahaan` (
  `nama` varchar(50) NOT NULL default '0',
  `alamat` text,
  `telp` varchar(50) default NULL,
  `fax` varchar(25) default NULL,
  `kota` varchar(50) default NULL,
  `propinsi` varchar(50) default NULL,
  `negara` varchar(50) default NULL,
  `lokasi` varchar(7) default 'PUSAT',
  `kd_pembelian` char(3) default NULL,
  `kd_produksi` char(3) default 'KPR',
  `kd_return_pembelian` char(3) default NULL,
  `kd_terima_return` char(3) default NULL,
  `kd_penjualan_toko` char(3) default NULL,
  `kd_return_penjualan` char(3) default NULL,
  `kd_pengeluaran` char(3) default NULL,
  `kd_bayar_hutang` char(3) default NULL,
  `kd_bayar_piutang` char(3) default NULL,
  `kd_mutasi_kas` char(3) default NULL,
  `kd_tukar_point` char(3) default NULL,
  `kd_penyesuaian_stok` char(3) default NULL,
  `kd_visa` varchar(10) default NULL,
  `p_visa` decimal(25,2) default '0.00',
  `kd_master` varchar(10) default NULL,
  `p_master` decimal(25,2) default '0.00',
  `kd_bni_card` varchar(10) default NULL,
  `p_bni_card` decimal(25,2) default '0.00',
  `kd_bca_card` varchar(10) default NULL,
  `p_bca_card` decimal(25,2) default '0.00',
  `footer_pembelian` text,
  `tutup_form_setelah_disimpan` varchar(5) default NULL,
  `aktivkan_login` varchar(5) default NULL,
  `id_operator` varchar(50) default NULL,
  `nama_operator` varchar(100) default NULL,
  `preview_moda` varchar(5) default NULL,
  `point_member` decimal(25,2) default '0.00',
  `jumlah_point_member` decimal(25,2) default '0.00',
  `clear_point_member` varchar(5) default NULL,
  `point_komisi_member` decimal(25,2) default '0.00',
  `clear_point_pelanggan` varchar(5) default NULL,
  `identitas_cabang` varchar(25) default NULL,
  `abaikanstok` varchar(5) default 'False',
  `tinggilaporan` decimal(30,2) default '0.00',
  `tingginota` decimal(30,2) default '0.00',
  `tinggitext` decimal(30,2) default '0.00',
  `otomatis_tambah_beli` varchar(5) default 'True',
  `otomatis_tambah_jual` varchar(5) default 'True',
  `mode_cari_jual` varchar(15) default 'kode',
  `footer_penjualan_toko` text,
  `footer_penjualan_partai` text,
  `footer_penjualan_cabang` text,
  `mode_cetak_struk` varchar(15) default 'preview',
  `otomatis_backup` varchar(5) default 'False',
  `format_diskon_jual` varchar(10) default 'Persen',
  `proteksi_harga_jual` varchar(15) default 'Aktiv',
  `kd_po` char(3) default 'KPO',
  `kd_po_jual` char(3) default 'KPO',
  `kd_mandiri_card` varchar(10) default 'MANDIRI',
  `kd_permata_card` varchar(10) default 'PERMATA',
  `p_mandiri_card` decimal(30,2) default '0.00',
  `p_permata_card` decimal(30,2) default '0.00',
  `metode_hpp` varchar(15) default 'FIFO',
  `logo` varchar(200) default NULL,
  `kode_lokasi` char(3) default NULL,
  `header` varchar(25) default NULL,
  `stok_boleh_minus` varchar(5) default 'False',
  `nonpwp` varchar(50) default NULL,
  `kode` varchar(50) default '001',
  `alamat_server` varchar(50) default 'http://www.software-id.com/online/',
  `pesan_penerimaan_data` varchar(5) default 'False',
  `otomatis_terima_data` varchar(5) default 'False',
  `kode_kas_otomatis` varchar(25) default 'KP',
  `kode_supplier_otomatis` varchar(25) default 'PST',
  `username` varchar(25) default NULL,
  `pass` varchar(25) default NULL,
  `penyamaran_hpp` varchar(15) default 'TIDAK',
  `kode_otomatis` varchar(5) default 'Tidak',
  `otomatis_update_hpp` varchar(5) default 'True',
  `tidakbolehhargajuallebihbesardarihargabeli` varchar(50) default 'False',
  `multi_stok` varchar(5) default 'False',
  `pembulatan_otomatis` varchar(5) default 'False',
  `samar_0` char(1) default 'A',
  `samar_1` char(1) default 'B',
  `samar_2` char(1) default 'C',
  `samar_3` char(1) default 'D',
  `samar_4` char(1) default 'E',
  `samar_5` char(1) default 'F',
  `samar_6` char(1) default 'G',
  `samar_7` char(1) default 'H',
  `samar_8` char(1) default 'I',
  `samar_9` char(1) default 'J',
  `samar_titik` char(1) default 'K',
  `samar_koma` char(1) default 'L',
  `drop_order_penjualan` varchar(5) default 'False',
  `fitur_canvasing_aktiv` varchar(5) default 'False',
  `fitur_shift` varchar(5) default 'False',
  `logo_jual` varchar(200) default NULL,
  `timer_order_penjualan` varchar(5) default 'False',
  `lvl_hrg_tk_1` varchar(5) default 'False',
  `nonppkp` varchar(50) default NULL,
  `formatfaktur` varchar(25) default 'Default',
  `formatfaktur_digit` int(3) default '15',
  `pwd_wb` varchar(200) default NULL,
  `noseri` varchar(15) default NULL,
  `usr_pwd` varchar(25) default NULL,
  `bg_card` varchar(250) default NULL,
  `footer_faktur` varchar(50) default '** Terima Kasih **',
  `kode_pelanggan_otomatis` varchar(5) default 'TIDAK',
  `point_isi_otomatis_dari_laba_penjualan` varchar(5) default 'False',
  `nilai_point_isi_otomatis_dari_laba_penjualan` decimal(30,2) default '0.00',
  `hrg_per_supplier_aktiv` varchar(5) default 'False',
  `oks_kirim_jual_active` varchar(5) default 'False',
  `teks_berjalan_penjualan` varchar(200) default NULL,
  `auto_start_apache` varchar(5) default 'False',
  `harga_jual_include_pajak` varchar(5) default 'False',
  `semua_barang_kena_pajak` varchar(5) default 'True',
  `semua_pelanggan_kena_pajak` varchar(5) default 'True',
  `default_centang_pajak` varchar(5) default 'True',
  `default_centang_pajak_dipelanggan` varchar(5) default 'True',
  `ppn_otomatis_terisi` varchar(5) default 'False',
  `ppn_otomatis_terisi_senilai` decimal(30,2) default '10.00',
  `isi_no_faktur_pajak` varchar(5) default 'False',
  `fitur_faktur_pajak` varchar(5) default 'True',
  `nama_pkp` varchar(50) default NULL,
  `alamat_pkp` varchar(200) default NULL,
  `isi_manual_barang_penjualan` varchar(5) default 'False',
  `pin_sms` varchar(15) default '1234',
  `formatfaktur_custom` varchar(10) default NULL,
  `label_penjualan_toko` varchar(25) default 'PENJUALAN TOKO',
  `label_penjualan_partai` varchar(25) default 'PENJUALAN PARTAI',
  `label_penjualan_cabang` varchar(25) default 'PENJUALAN CABANG',
  `label_hrg_p_toko` varchar(25) default 'HARGA TOKO',
  `label_hrg_p_partai` varchar(25) default 'HARGA PARTAI',
  `label_hrg_p_cabang` varchar(25) default 'HARGA CABANG',
  `kd_pemasukan` char(3) default 'PMK',
  `footer_faktur2` varchar(50) default 'Silahkan datang kembali',
  `kembalian_boleh_input_tabungan` varchar(5) default 'False',
  `label_penjualan_lain` varchar(25) default 'PENJUALAN LAIN',
  `label_hrg_p_lain` varchar(25) default 'HARGA LAIN',
  `urlserver` varchar(50) default 'http://www.software-id.net',
  `d_global_hanya_jika_blm_diskon_detail` varchar(5) default 'False',
  `md_dev` varchar(5) default 'False',
  PRIMARY KEY  (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stok_per_ukuran_warna` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_barang` varchar(50) default NULL,
  `ukuran` varchar(50) default NULL,
  `warna` varchar(50) default NULL,
  `toko` decimal(30,2) default '0.00',
  `gudang` decimal(30,2) default '0.00',
  `harga` decimal(30,2) default '0.00',
  `gambar` varchar(200) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subitempenjualan` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `no_faktur` varchar(25) default NULL,
  `kode_barang` varchar(25) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(25) default NULL,
  `qty` decimal(30,2) default '0.00',
  `harga` decimal(30,2) default '0.00',
  `subtotal` decimal(30,2) default '0.00',
  `kd_barang` varchar(25) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `supplier` (
  `kode` varchar(25) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `alamat` varchar(200) default NULL,
  `saldo_piutang` decimal(30,2) default '0.00',
  `tgl_saldo` date default NULL,
  `nomor` varchar(50) default NULL,
  `telp` varchar(25) default NULL,
  `fax` varchar(25) default NULL,
  `email` varchar(50) default NULL,
  `no_npwp` varchar(50) default NULL,
  `tampil` varchar(5) default 'False',
  `kdgrouphrg` varchar(25) default NULL,
  `kota` varchar(50) default NULL,
  `alamat2` varchar(200) default NULL,
  `contact` varchar(50) default NULL,
  `saldo_deposit` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tabel_angsuran` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(35) default NULL,
  `angsuranke` int(11) default '0',
  `tanggal` date default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `dibayar` varchar(5) default 'False',
  `tanggal_pembayaran` date default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tabungan` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `jam` time default NULL,
  `pelanggan` varchar(15) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  `jenis` varchar(10) default 'DEBET',
  `keterangan` varchar(50) default NULL,
  `kode_kas` varchar(25) default NULL,
  `sumber` varchar(15) default 'NONE',
  `sumber_faktur` varchar(25) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama` varchar(50) default NULL,
  `jumlah` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_barang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(50) default NULL,
  `nama` varchar(50) default NULL,
  `kategori` varchar(50) default NULL,
  `satuan` varchar(50) default NULL,
  `qty` varchar(50) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_barang_diskon` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_barang` varchar(50) default NULL,
  `nama_barang` varchar(50) default NULL,
  `qty` decimal(30,2) default '0.00',
  `harga` decimal(30,2) default '0.00',
  `satuan` varchar(25) default NULL,
  `jenis` varchar(25) default NULL,
  `hpp` decimal(30,2) default '0.00',
  `kode_barang_sbr` varchar(25) default NULL,
  `diskon` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_grafik` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bulan` decimal(25,2) default '0.00',
  `qty` decimal(25,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_item_hutang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(25) default NULL,
  `kode_hutang` varchar(50) default NULL,
  `jumlah` decimal(25,2) unsigned default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_item_lap_laba_rugi` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(50) default NULL,
  `kode_barang` varchar(50) default NULL,
  `qty` decimal(25,2) default '0.00',
  `harga_jual` decimal(25,2) default '0.00',
  `harga_pokok` decimal(25,2) default '0.00',
  `selisih` decimal(25,2) default '0.00',
  `laba_rugi` decimal(25,2) default '0.00',
  `biaya` decimal(25,2) default '0.00',
  `tampilkan` varchar(5) default 'False',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_jurnal` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_kas` varchar(25) default NULL,
  `tanggal` date default NULL,
  `kode` varchar(25) default NULL,
  `keterangan` varchar(50) default NULL,
  `debet` decimal(30,2) default '0.00',
  `kredit` decimal(30,2) default '0.00',
  `saldo` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_kartu_stok` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  `kode` varchar(25) default NULL,
  `customer` varchar(25) default NULL,
  `stokawal` decimal(30,2) default '0.00',
  `masuk` decimal(30,2) default '0.00',
  `keluar` decimal(30,2) default '0.00',
  `sisa` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_kas` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(50) default NULL,
  `saldo_sebelum` decimal(30,2) default '0.00',
  `saldo_setelah` decimal(30,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_kategori` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(200) default NULL,
  `nama` varchar(200) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_lap_laba_rugi` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  `kode` varchar(25) default NULL,
  `keterangan` varchar(50) default NULL,
  `penjualan` decimal(25,2) default '0.00',
  `hpp_jual` decimal(25,2) default '0.00',
  `diskon` decimal(25,2) default '0.00',
  `biaya` decimal(25,2) default '0.00',
  `laba_rugi` decimal(25,2) default '0.00',
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_lap_mutasi_hutang_piutang` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  `kode` varchar(25) default NULL,
  `keterangan` varchar(50) default NULL,
  `debet` decimal(25,2) unsigned default '0.00',
  `kredit` decimal(25,2) unsigned default '0.00',
  `saldo` decimal(25,2) unsigned default '0.00',
  `supplier` varchar(100) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_pelanggan` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode` varchar(200) default NULL,
  `nama` varchar(200) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_point` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  `kode` varchar(50) default NULL,
  `kode_barang` varchar(50) default NULL,
  `nama_barang` varchar(50) default NULL,
  `qty` decimal(30,2) default '0.00',
  `return` decimal(30,2) default '0.00',
  `point` decimal(30,2) default '0.00',
  `operator` varchar(200) default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `temp_tanggal` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` date default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tukangjahit` (
  `kode` varchar(25) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `alamat` varchar(50) default NULL,
  `telp` varchar(15) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tukar_point` (
  `kode` varchar(25) NOT NULL default '',
  `tanggal` date default NULL,
  `jam` time default NULL,
  `id_member` varchar(200) default NULL,
  `kode_barang` varchar(50) default NULL,
  `nama_barang` varchar(50) default NULL,
  `satuan` varchar(25) default NULL,
  `qty` decimal(25,2) default '0.00',
  `harga` decimal(25,2) default '0.00',
  `jumlah` decimal(25,2) default '0.00',
  `point_sebelum` decimal(25,2) default '0.00',
  `point_kredit` decimal(25,2) default '0.00',
  `operator` varchar(50) default NULL,
  `hpp` decimal(30,2) default '0.00',
  `jenis_tukar_point` varchar(15) default 'BARANG',
  `kode_kas` varchar(15) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `type` (
  `kode` varchar(50) NOT NULL default '',
  `nama` varchar(50) default NULL,
  `hpp` decimal(30,2) default NULL,
  `ongkosproduksi` decimal(30,2) default NULL,
  `ongkosjahit` decimal(30,2) default '0.00',
  `hargajual` decimal(30,2) default NULL,
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ukuran` (
  `kode` varchar(25) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `update_database` (
  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `Version` varchar(25) default NULL,
  `Tanggal` date default NULL,
  PRIMARY KEY (`app_row_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `voucher` (
  `kode` varchar(50) NOT NULL default '',
  `tanggal_mulai` date default NULL,
  `tanggal_expired` date default NULL,
  `saldo` decimal(30,2) default '0.00',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `warna` (
  `kode` varchar(25) NOT NULL default '',
  PRIMARY KEY  (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
