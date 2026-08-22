<?php
namespace App\Http\Controllers;

use App\Models\AppPaymentMethod;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class PaymentMethodController
{
    // GET /payment-methods — active methods only, ordered for checkout (gated pos:read so
    // cashiers can load them). Kept separate from the admin list below deliberately.
    public function index(): JsonResponse
    {
        return response()->json(
            AppPaymentMethod::where('active', true)->orderBy('sort_order')->orderBy('id')
                ->get()->map(fn (AppPaymentMethod $m) => $this->present($m))
        );
    }

    // GET /settings/payment-methods — all methods incl. inactive (settings:read).
    public function adminIndex(): JsonResponse
    {
        return response()->json(
            AppPaymentMethod::orderBy('sort_order')->orderBy('id')
                ->get()->map(fn (AppPaymentMethod $m) => $this->present($m))
        );
    }

    public function store(Request $request): JsonResponse
    { return $this->persist($request, null); }

    public function update(Request $request, string $id): JsonResponse
    { return $this->persist($request, $id); }

    private function persist(Request $request, ?string $id): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('app_payment_methods', 'code')->ignore($id)],
            'name' => 'required|string|max:100',
            'type' => 'required|in:cash,credit,transfer,qris,other',
            'legacyKasCode' => 'nullable|string|max:15',
            'active' => 'required|boolean',
            'sortOrder' => 'required|integer|min:0|max:9999',
        ]);
        $method = $id ? AppPaymentMethod::findOrFail($id) : new AppPaymentMethod();
        $isNew = !$method->exists;
        $method->fill([
            'code' => strtoupper($data['code']),
            'name' => $data['name'],
            'type' => $data['type'],
            'legacy_kas_code' => $data['legacyKasCode'] ?: null,
            'active' => $data['active'],
            'sort_order' => $data['sortOrder'],
        ])->save();
        $desc = $isNew
            ? "Metode pembayaran ditambahkan: {$method->name} ({$method->code})."
            : "Metode pembayaran diperbarui: {$method->name} ({$method->code}).";
        AuditLogger::log('payment-method-update', $desc, $request->user()?->nama ?? 'system');
        return response()->json($this->present($method));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $method = AppPaymentMethod::findOrFail($id);
        $name = $method->name; $code = $method->code;
        $method->delete();
        AuditLogger::log('payment-method-update', "Metode pembayaran dihapus: {$name} ({$code}).", $request->user()?->nama ?? 'system');
        return response()->json(['message' => 'ok']);
    }

    private function present(AppPaymentMethod $m): array
    {
        return [
            'id' => (string) $m->id, 'code' => $m->code, 'name' => $m->name, 'type' => $m->type,
            'legacyKasCode' => $m->legacy_kas_code, 'active' => (bool) $m->active, 'sortOrder' => (int) $m->sort_order,
        ];
    }
}
