<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Production has zero rows in hr_shifts, which makes shift assignment/attendance-status
    // detection unusable (the "Jadwalkan shift" dropdown has nothing to offer). Seeds 3 default
    // shift definitions typical of an Indonesian minimarket. insertOrIgnore keeps this migration
    // idempotent/reproducible rather than an ad-hoc manual INSERT.
    public function up(): void
    {
        DB::table('hr_shifts')->insertOrIgnore([
            ['name' => 'Pagi', 'start_time' => '08:00:00', 'end_time' => '16:00:00', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Siang', 'start_time' => '12:00:00', 'end_time' => '20:00:00', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Malam', 'start_time' => '16:00:00', 'end_time' => '22:00:00', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        DB::table('hr_shifts')->whereIn('name', ['Pagi', 'Siang', 'Malam'])->delete();
    }
};
