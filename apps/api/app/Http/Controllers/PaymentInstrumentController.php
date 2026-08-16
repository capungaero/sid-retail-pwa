<?php
namespace App\Http\Controllers;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// pending -> cleared and pending -> bounced only; cleared/bounced are final. See finance.ts
// (canTransitionInstrument) on the frontend for the same rule.
final class PaymentInstrumentController
{
    private const ALLOWED_TRANSITIONS = ['pending' => ['cleared', 'bounced'], 'cleared' => [], 'bounced' => []];

    public function index(): JsonResponse
    { return response()->json(DB::table('app_payment_instruments')->orderBy('created_at')->get()->map([$this, 'map'])); }

    public function store(Request $request): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing, 201);

        $data = $request->validate([
            'kind' => 'required|in:card,voucher,giro',
            'reference' => 'required|string|max:64',
            'amount' => 'required|numeric|gt:0',
            'note' => 'nullable|string|max:255',
        ]);
        try {
            $result = DB::transaction(function () use ($data, $idempotencyKey) {
                $row = [
                    'id' => (string) Str::uuid(), 'kind' => $data['kind'], 'reference' => $data['reference'],
                    'amount' => $data['amount'], 'status' => 'pending', 'note' => $data['note'] ?? null,
                    'created_at' => now(), 'cleared_at' => null,
                ];
                DB::table('app_payment_instruments')->insert($row);
                $mapped = $this->map((object) $row);
                Idempotency::store($idempotencyKey, 'finance-instruments', $mapped);
                return $mapped;
            });
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner, 201);
            throw $e;
        }
        return response()->json($result, 201);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:pending,cleared,bounced']);
        try {
            $instrument = DB::transaction(function () use ($id, $data) {
                $row = DB::table('app_payment_instruments')->where('id', $id)->lockForUpdate()->first();
                if (!$row) throw ValidationException::withMessages(['id' => 'Instrumen tidak ditemukan']);
                if (!in_array($data['status'], self::ALLOWED_TRANSITIONS[$row->status] ?? [], true)) {
                    throw ValidationException::withMessages(['status' => 'Perubahan status tidak diizinkan']);
                }
                $clearedAt = $data['status'] === 'cleared' ? now() : null;
                DB::table('app_payment_instruments')->where('id', $id)->update(['status' => $data['status'], 'cleared_at' => $clearedAt]);
                return $this->map((object) array_merge((array) $row, ['status' => $data['status'], 'cleared_at' => $clearedAt]));
            });
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        }
        return response()->json($instrument);
    }

    public function map(object $r): array
    {
        return [
            'id' => (string) $r->id, 'kind' => $r->kind, 'reference' => $r->reference, 'amount' => (float) $r->amount,
            'status' => $r->status, 'note' => $r->note, 'createdAt' => (string) $r->created_at,
            'clearedAt' => $r->cleared_at !== null ? (string) $r->cleared_at : null,
        ];
    }
}
