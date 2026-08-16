<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
final class CustomerController
{
    public function __invoke(Request $request): JsonResponse
    {
        $q=(string)$request->query('search',''); $c=config('sid.customer.columns');
        $rows=DB::table(config('sid.customer.table'))->select(array_values($c))->when($q,fn($b)=>$b->where($c['name'],'like','%'.addcslashes($q,'%_').'%'))->limit(50)->get();
        return response()->json($rows->map(fn($r)=>['id'=>(string)$r->{$c['id']},'code'=>(string)$r->{$c['id']},'name'=>(string)$r->{$c['name']},'phone'=>null,'tier'=>(string)$r->{$c['group']} === '' ? 'retail' : 'member']));
    }
}
