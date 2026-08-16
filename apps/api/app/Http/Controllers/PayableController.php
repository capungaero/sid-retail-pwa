<?php
namespace App\Http\Controllers;
use App\Repositories\LegacyPayableRepository;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class PayableController
{
    public function index(LegacyPayableRepository $repo): JsonResponse
    { return response()->json($repo->all()); }

    public function addPayment(Request $request, string $id, LegacyPayableRepository $repo): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing);

        $data = $request->validate(['amount' => 'required|numeric|gt:0', 'note' => 'nullable|string|max:255']);
        try {
            $payable = $repo->addPayment($id, (float) $data['amount'], $data['note'] ?? null, $request->user()?->getKey(), $idempotencyKey);
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner);
            throw $e;
        }
        return response()->json($payable);
    }
}
