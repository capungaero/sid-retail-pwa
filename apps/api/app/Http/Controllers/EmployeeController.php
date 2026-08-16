<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Read-only: sources the legacy karyawan table via config('sid.auth.*') (the same
// mapping Employee/AuthController use for login). Never writes to karyawan.
final class EmployeeController
{
    public function __invoke(Request $request): JsonResponse
    {
        $q = (string) $request->query('search', ''); $c = config('sid.auth.columns');
        $rows = DB::table(config('sid.auth.table'))->select([$c['id'], $c['name'], $c['role']])
            ->when($q, fn ($b) => $b->where($c['name'], 'like', '%'.addcslashes($q, '%_').'%'))
            ->orderBy($c['name'])->limit(200)->get();
        return response()->json($rows->map(fn ($r) => ['id' => (string) $r->{$c['id']}, 'name' => (string) $r->{$c['name']}, 'role' => (string) ($r->{$c['role']} ?? '')]));
    }
}
