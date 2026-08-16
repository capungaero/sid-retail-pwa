<?php
return [
    // Dedicated least-privilege credential for `mysqldump` in SettingsBackupController — the
    // sid_migrator DDL/backup user, never the app's runtime sid_app connection and never root.
    'backup' => [
        'username' => env('BACKUP_DB_USERNAME'),
        'password' => env('BACKUP_DB_PASSWORD'),
    ],
    // Compatibility mappings are explicit: never infer a legacy column at runtime.
    'product' => [
        'table' => env('SID_PRODUCT_TABLE', 'barang'),
        'columns' => [
            'id' => 'kode', 'code' => 'kode', 'barcode' => 'kode_barcode', 'name' => 'nama',
            'stock' => 'toko', 'cost' => 'hpp', 'price' => 'harga_toko',
            'unit' => 'satuan', 'multiplier' => 'isi',
        ],
    ],
    'customer' => ['table' => env('SID_CUSTOMER_TABLE', 'pelanggan'), 'columns' => ['id'=>'kode','name'=>'nama','address'=>'alamat','group'=>'kdgrouphrg']],
    // karyawan: legacy MD5 password verified once, then upgraded to Argon2id in app_password_upgrades (see AuthController).
    'auth' => [
        'table' => env('SID_AUTH_TABLE', 'karyawan'),
        'columns' => ['id' => 'kode', 'password' => 'password', 'name' => 'nama', 'role' => 'level'],
    ],
    'sale' => [
        'table' => env('SID_SALE_TABLE', 'penjualan'),
        'columns' => [
            'id' => 'kode', 'date' => 'tanggal', 'customer_code' => 'pelanggan', 'customer_name' => 'nama_pelanggan',
            'subtotal' => 'subtotal', 'discount' => 'diskon_rupiah', 'total' => 'jumlah', 'paid' => 'bayar',
            'change' => 'kembali', 'cashier' => 'kasir', 'operator' => 'operator', 'status' => 'status',
            'time' => 'jam', 'shift' => 'shif',
        ],
    ],
    'sale_item' => [
        'table' => env('SID_SALE_ITEM_TABLE', 'itempenjualan'),
        'columns' => [
            'sale_id' => 'kode', 'line_no' => 'nourut', 'product_code' => 'kode_barang', 'product_name' => 'nama_barang',
            'unit' => 'satuan', 'qty' => 'qty', 'price' => 'harga', 'discount_rupiah' => 'diskon_rupiah',
            'subtotal' => 'subtotal', 'hpp' => 'hpp',
        ],
    ],
    'supplier' => [
        'table' => env('SID_SUPPLIER_TABLE', 'supplier'),
        'columns' => ['id' => 'kode', 'code' => 'kode', 'name' => 'nama', 'phone' => 'telp', 'address' => 'alamat'],
    ],
    // mutasikas = cash ledger (mutasi kas). Legacy `debet`/`kredit` are account-code columns
    // (double-entry references), not amounts, and the table has no direction/balance column
    // of its own — it is empty in production (verified via read-only SELECT COUNT(*)), so this
    // app repurposes the two unused varchar columns: `debet` stores the literal direction
    // ('in'|'out') and `kredit` stores the category. `keterangan` stores the optional note.
    // balanceAfter is not persisted; it is computed as a running sum over `rupiah` ordered by
    // `kode` (see CashLedgerRepository).
    'cash_ledger' => [
        'table' => env('SID_CASH_LEDGER_TABLE', 'mutasikas'),
        'columns' => [
            'id' => 'kode', 'date' => 'tanggal', 'direction' => 'debet', 'category' => 'kredit',
            'note' => 'keterangan', 'amount' => 'rupiah', 'operator' => 'operator',
        ],
    ],
    // hutang = payable owed to a supplier. `jumlah` is treated as a FIXED OPENING BALANCE as of
    // migration — see LegacyPayableRepository's header comment. CORRECTED 2026-08-16: an earlier
    // version of this file wrongly documented itemhutang.kode_hutang as "the FK to hutang.kode"
    // and itemhutang was used as a payment ledger. Verified empirically against production data
    // that this is false: itemhutang.kode_hutang actually references pembelian.kode (100% match,
    // 984/984 rows); it is itemhutang.kode that matches hutang.kode (also 100%). itemhutang is
    // invoice-composition data (which purchase invoices were bundled into a supplier debt batch),
    // NOT a payment/installment history, and must never be summed to compute an outstanding
    // balance. No legacy table holds real payment history for hutang (mutasikas,
    // pembayaran_angsuran, tabel_angsuran are all empty in production) — new payments are tracked
    // in app_payable_payments instead (see migration 2026_08_16_070040). itemhutang is not read
    // by this app at all.
    'payable' => [
        'table' => env('SID_PAYABLE_TABLE', 'hutang'),
        'columns' => [
            'id' => 'kode', 'date' => 'tanggal', 'supplier_code' => 'supplier', 'amount' => 'jumlah',
            'note' => 'ket', 'operator' => 'operator',
        ],
    ],
    // piutang = receivable owed by a customer. Mirrors payable — see the itemhutang correction
    // above; the same wrong-FK mistake existed for itempiutang.kode_piutang (references
    // penjualan.kode, not piutang.kode) and has been corrected the same way. itempiutang is not
    // read by this app at all; see app_receivable_payments (migration 2026_08_16_070040).
    'receivable' => [
        'table' => env('SID_RECEIVABLE_TABLE', 'piutang'),
        'columns' => [
            'id' => 'kode', 'date' => 'tanggal', 'customer_code' => 'pelanggan', 'amount' => 'jumlah',
            'note' => 'ket', 'operator' => 'operator',
        ],
    ],
    // pembelian has no dedicated 3-state PO status column, so 'draft'/'open'/'received' is mapped
    // onto the two legacy flags (see LegacyPurchaseRepository::statusOf):
    //   draft    => po='True',  receive='False' (created, not yet opened for receiving)
    //   open     => po='False', receive='False' (open for receiving, not yet complete)
    //   received => po='False', receive='True'  (every line fully received)
    'purchase' => [
        'table' => env('SID_PURCHASE_TABLE', 'pembelian'),
        'columns' => [
            'id' => 'kode', 'date' => 'tanggal', 'supplier_code' => 'supplier', 'note' => 'keterangan',
            'total' => 'jumlah', 'po' => 'po', 'receive' => 'receive', 'operator' => 'operator', 'stock_location' => 'lokasistok',
        ],
    ],
    'purchase_item' => [
        'table' => env('SID_PURCHASE_ITEM_TABLE', 'itempembelian'),
        'columns' => [
            'purchase_id' => 'kode', 'line_no' => 'nourut', 'product_code' => 'kode_barang', 'product_name' => 'nama_barang',
            'unit' => 'satuan', 'qty' => 'qty', 'cost' => 'harga_beli', 'price' => 'harga_toko',
            'subtotal' => 'subtotal', 'received_qty' => 'qty_terima',
        ],
    ],
    'stock_correction' => [
        'table' => env('SID_STOCK_CORRECTION_TABLE', 'koreksi'),
        'columns' => ['id' => 'kode', 'date' => 'tanggal', 'total' => 'jumlah', 'operator' => 'operator', 'stock_location' => 'lokasistok', 'kind' => 'jenis'],
    ],
    'stock_correction_item' => [
        'table' => env('SID_STOCK_CORRECTION_ITEM_TABLE', 'itemkoreksi'),
        'columns' => [
            'correction_id' => 'kode', 'product_code' => 'kode_barang', 'product_name' => 'nama_barang', 'unit' => 'satuan',
            'prev_stock' => 'stok_lalu', 'new_stock' => 'stok_kini', 'reason' => 'alasan', 'diff' => 'selisih', 'hpp' => 'hpp',
        ],
    ],
];
