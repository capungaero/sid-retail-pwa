<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not one of the 137 legacy tables). No legacy shift-definition table
    // exists — karyawan.jammasuk/jamkeluar is only a per-employee master default, not
    // a set of named shifts. Confirmed via SHOW TABLES on sid_retail (2026-08-16).
    public function up(): void
    {
        Schema::create('hr_shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_shifts');
    }
};
