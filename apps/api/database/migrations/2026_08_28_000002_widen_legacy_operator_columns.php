<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Legacy karyawan.kode identifiers are short (varchar 15-25), but app_user_settings logins
    // (added 2026_08_28_000001) store a 36-char UUID in these same "who did this" columns —
    // e.g. penjualan.kasir is varchar(25), so a sale rung up by an app_user_settings kasir threw
    // "Data too long for column 'kasir'" and 500'd the whole checkout. Widened to 50 (matching
    // the sibling penjualan.operator column, which was already sized for this) everywhere the
    // app writes $request->user()->getKey() into a legacy table. Raw ALTERs, not the schema
    // builder — the runtime sid_app DB user has no ALTER privilege (see migration
    // 2026_08_28_000001's deploy notes), so this migration's SQL is run directly as sid_migrator
    // and this file exists for history/review rather than being executed by `artisan migrate`.
    public function up(): void
    {
        DB::statement('ALTER TABLE penjualan MODIFY kasir VARCHAR(50) NULL');
        DB::statement('ALTER TABLE hutang MODIFY operator VARCHAR(50) NULL');
        DB::statement('ALTER TABLE piutang MODIFY operator VARCHAR(50) NULL');
        DB::statement('ALTER TABLE mutasikas MODIFY operator VARCHAR(50) NULL');
        DB::statement('ALTER TABLE pembelian MODIFY operator VARCHAR(50) NULL');
        DB::statement('ALTER TABLE koreksi MODIFY operator VARCHAR(50) NULL');
    }

    public function down(): void
    {
        // Not reversible to the original widths without risking truncation of UUIDs already
        // stored by app_user_settings accounts — intentionally left as a no-op.
    }
};
