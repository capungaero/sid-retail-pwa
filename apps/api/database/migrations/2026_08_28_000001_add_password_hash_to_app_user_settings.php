<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // app_user_settings becomes a second login source alongside legacy `karyawan` (see
    // AuthController) — accounts created from Pengaturan > Pengguna can now actually sign in.
    // Nullable because existing rows (created before this migration) have no password yet;
    // UserAccountController requires one for every new row going forward.
    public function up(): void
    {
        Schema::table('app_user_settings', function (Blueprint $table) {
            $table->string('password_hash', 255)->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('app_user_settings', function (Blueprint $table) {
            $table->dropColumn('password_hash');
        });
    }
};
