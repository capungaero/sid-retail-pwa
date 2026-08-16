<?php
namespace App\Http\Controllers;

use App\Models\AppStoreProfile;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class StoreProfileController
{
    public function show(): JsonResponse
    { return response()->json($this->present(AppStoreProfile::firstOrFail())); }

    // Mirrors apps/web/src/lib/settings.ts validateStoreProfile — never trust the client.
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'address' => 'required|string|max:500',
            'phone' => ['required', 'string', 'regex:/^[0-9+\-() ]{6,20}$/'],
            'taxId' => ['nullable', 'string', 'regex:/^[0-9.\-]{5,25}$/'],
            'receiptHeader' => 'nullable|string|max:255',
            'receiptFooter' => 'nullable|string|max:255',
        ]);
        $profile = AppStoreProfile::firstOrFail();
        $profile->update([
            'name' => $data['name'], 'address' => $data['address'], 'phone' => $data['phone'],
            'tax_id' => $data['taxId'] ?? null, 'receipt_header' => $data['receiptHeader'] ?? null,
            'receipt_footer' => $data['receiptFooter'] ?? null,
        ]);
        AuditLogger::log('store-profile-update', "Profil toko & struk diperbarui: {$profile->name}", $request->user()?->nama ?? 'system');
        return response()->json($this->present($profile));
    }

    private function present(AppStoreProfile $p): array
    {
        return [
            'name' => $p->name, 'address' => $p->address, 'phone' => $p->phone,
            'taxId' => $p->tax_id, 'receiptHeader' => $p->receipt_header, 'receiptFooter' => $p->receipt_footer,
        ];
    }
}
