<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Which cashier's own today's cash takings a "dari transaksi harian" kas keluar was drawn
    // from. Only meaningful for funding_source = 'daily' - a 'loan' draw isn't attributed to any
    // one cashier, it comes out of the overall pool. Free-text name (not an id/FK): SaleController
    // only ever exposes a display cashierName to the frontend, never the raw karyawan/app_user
    // id, so there is nothing stable to reference here.
    public function up(): void
    {
        Schema::table('app_cash_entry_funding', function (Blueprint $table) {
            $table->string('cashier_name', 100)->nullable()->after('funding_source');
        });
    }

    public function down(): void
    {
        Schema::table('app_cash_entry_funding', function (Blueprint $table) {
            $table->dropColumn('cashier_name');
        });
    }
};
