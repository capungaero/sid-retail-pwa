<?php
namespace App\Http\Controllers;
use App\Repositories\LegacySupplierRepository;
use App\Repositories\LegacySupplierWriteRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SupplierController
{
    public function __construct(private readonly LegacySupplierWriteRepository $writer) {}

    public function index(Request $request, LegacySupplierRepository $suppliers): JsonResponse
    { return response()->json($suppliers->search((string)$request->query('search', ''))); }
    public function store(Request $request): JsonResponse
    { return $this->persist($request, null); }
    public function update(Request $request, string $id): JsonResponse
    { return $this->persist($request, $id); }
    private function persist(Request $request, ?string $id): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:25',
            'name' => 'required|string|max:50',
            'phone' => 'nullable|string|max:25',
            'address' => 'nullable|string|max:200',
        ]);
        $key = $this->writer->save($data, $id);
        return response()->json(['id' => $key, 'code' => $data['code'], 'name' => $data['name'], 'phone' => $data['phone'] ?? null, 'address' => $data['address'] ?? null]);
    }
}
