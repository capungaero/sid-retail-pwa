<?php
namespace App\Http\Controllers;
use App\Models\AppProductPhoto;
use App\Repositories\LegacyProductRepository;
use App\Repositories\LegacyProductWriteRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

final class ProductController
{
    // Longest side a stored product photo may have, matching the client-side compression
    // target (see Products.tsx) — server-side re-compression is the safety net, never trusts
    // the client's already-compressed upload.
    private const MAX_DIMENSION = 1000;
    private const JPEG_QUALITY = 78;

    public function __construct(private readonly LegacyProductWriteRepository $writer) {}

    public function index(Request $request, LegacyProductRepository $products): JsonResponse
    { return response()->json($products->search((string)$request->query('search',''), $request->boolean('lowStock'))); }
    public function store(Request $request): JsonResponse
    { return $this->persist($request, null); }
    public function update(Request $request, string $id): JsonResponse
    { return $this->persist($request, $id); }

    // Compresses and stores a product photo on disk (storage/app/public/products/{kode}.jpg),
    // never in the `barang` table or any legacy table — app_product_photos (new table, no FK)
    // only tracks the file's path/metadata. Never trusts the client's declared mime type: the
    // actual bytes are inspected via getimagesize() before any GD call touches them.
    public function uploadPhoto(Request $request, string $id): JsonResponse
    {
        $request->validate(['photo' => 'required|file|mimes:jpeg,jpg,png,webp|max:8192']);

        $table = config('sid.product.table');
        $code = config('sid.product.columns')['code'];
        if (!DB::table($table)->where($code, $id)->exists()) {
            return response()->json(['message' => 'Barang tidak ditemukan.'], 404);
        }

        $file = $request->file('photo');
        $info = @getimagesize($file->getRealPath());
        $decoders = [IMAGETYPE_JPEG => 'imagecreatefromjpeg', IMAGETYPE_PNG => 'imagecreatefrompng', IMAGETYPE_WEBP => 'imagecreatefromwebp'];
        if ($info === false || !isset($decoders[$info[2]])) {
            return response()->json(['message' => 'File bukan gambar yang valid.'], 422);
        }
        // getimagesize() only reads the header, so a tiny file can still declare huge
        // dimensions (decompression-bomb): reject before the GD decoder ever allocates the
        // full decoded bitmap in memory.
        if ($info[0] * $info[1] > 25_000_000) {
            return response()->json(['message' => 'Dimensi gambar terlalu besar.'], 422);
        }

        $source = $decoders[$info[2]]($file->getRealPath());
        if ($source === false) {
            return response()->json(['message' => 'Gagal membaca gambar.'], 422);
        }

        $width = imagesx($source); $height = imagesy($source);
        $longest = max($width, $height);
        if ($longest > self::MAX_DIMENSION) {
            $scale = self::MAX_DIMENSION / $longest;
            $newWidth = max(1, (int) round($width * $scale));
            $newHeight = max(1, (int) round($height * $scale));
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($source);
            $source = $resized;
        }

        $dir = storage_path('app/public/products');
        File::ensureDirectoryExists($dir);
        $relativePath = "products/{$id}.jpg";
        $fullPath = storage_path("app/public/{$relativePath}");
        imagejpeg($source, $fullPath, self::JPEG_QUALITY);
        imagedestroy($source);

        AppProductPhoto::updateOrCreate(
            ['product_code' => $id],
            ['path' => $relativePath, 'mime' => 'image/jpeg', 'size_bytes' => filesize($fullPath)]
        );

        return response()->json(['photoUrl' => Storage::disk('public')->url($relativePath)]);
    }

    private function persist(Request $request, ?string $id): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:25',
            'barcode' => 'nullable|string|max:25',
            'name' => 'required|string|max:50',
            'category' => 'required|string|max:50',
            'minStock' => 'nullable|numeric|min:0',
            'stock' => 'required|numeric',
            'cost' => 'required|numeric|min:0',
            'units' => 'required|array|min:1',
            'units.*.name' => 'required|string|max:25',
            'units.*.multiplier' => 'required|numeric|gt:0',
            'units.*.price' => 'required|numeric|min:0',
        ]);
        $key = $this->writer->save($data, $id);
        return response()->json([
            'id' => $key, 'code' => $data['code'], 'barcode' => $data['barcode'] ?? '', 'name' => $data['name'],
            'category' => $data['category'], 'stock' => (float)$data['stock'], 'minStock' => (float)($data['minStock'] ?? 0), 'cost' => (float)$data['cost'],
            'units' => $data['units'], 'active' => true,
        ]);
    }
}
