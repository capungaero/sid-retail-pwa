<?php
namespace App\Http\Controllers;
use App\Repositories\LoanPayableRepository;
use App\Support\Idempotency;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class LoanPayableController
{
    public function index(LoanPayableRepository $repo): JsonResponse
    { return response()->json($repo->all()); }

    public function addPayment(Request $request, string $id, LoanPayableRepository $repo): JsonResponse
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($existing = Idempotency::find($idempotencyKey)) return response()->json($existing);

        $data = $request->validate(['amount' => 'required|numeric|gt:0', 'note' => 'nullable|string|max:255']);
        try {
            $loan = $repo->addPayment($id, (float) $data['amount'], $data['note'] ?? null, $idempotencyKey);
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first()], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ($winner = Idempotency::find($idempotencyKey))) return response()->json($winner);
            throw $e;
        }
        return response()->json($loan);
    }
}
