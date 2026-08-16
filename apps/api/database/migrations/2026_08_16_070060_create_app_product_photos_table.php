<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not one of the 137 legacy tables) — never adds a column to `barang`.
    // product_code mirrors barang.kode's type (varchar(25)) but carries no FK constraint,
    // matching this app's rule of never adding FKs onto legacy tables. The compressed image
    // bytes themselves live on disk (storage/app/public/products/{kode}.jpg); this table only
    // tracks the file's location and metadata. See ProductController::uploadPhoto.
    public function up(): void
    {
        Schema::create('app_product_photos', function (Blueprint $table) {
            $table->string('product_code', 25)->primary();
            $table->string('path', 255);
            $table->string('mime', 50);
            $table->unsignedInteger('size_bytes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_product_photos');
    }
};
