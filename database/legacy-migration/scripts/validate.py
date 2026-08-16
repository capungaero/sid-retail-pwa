from __future__ import annotations

import argparse
import json
import sys
from decimal import Decimal

import pymysql

from common import GENERATED, ensure_distinct_endpoints, quote, source_config, source_connection, target_config, text

METRICS = {
    "penjualan": ["COUNT(*)", "COALESCE(SUM(subtotal),0)", "COALESCE(SUM(jumlah),0)", "COALESCE(SUM(bayar),0)", "COALESCE(SUM(piutang),0)"],
    "itempenjualan": ["COUNT(*)", "COALESCE(SUM(qty),0)", "COALESCE(SUM(subtotal),0)"],
    "pembelian": ["COUNT(*)", "COALESCE(SUM(jumlah),0)", "COALESCE(SUM(hutang),0)"],
    "itempembelian": ["COUNT(*)", "COALESCE(SUM(qty),0)", "COALESCE(SUM(subtotal),0)"],
    "barang": ["COUNT(*)", "COALESCE(SUM(toko),0)", "COALESCE(SUM(gudang),0)", "COALESCE(SUM((toko + gudang) * hpp),0)"],
    "kas": ["COUNT(*)", "COALESCE(SUM(saldo),0)"],
    "hutang": ["COUNT(*)", "COALESCE(SUM(jumlah),0)"],
    "piutang": ["COUNT(*)", "COALESCE(SUM(jumlah),0)"],
    "labarugi": ["COUNT(*)", "COALESCE(SUM(penjualan),0)", "COALESCE(SUM(hpp),0)", "COALESCE(SUM(labarugi),0)"],
}

ORPHANS = {
    "itempenjualan_to_penjualan": "SELECT COUNT(*) FROM itempenjualan c LEFT JOIN penjualan p ON p.kode=c.kode WHERE p.kode IS NULL",
    "itempembelian_to_pembelian": "SELECT COUNT(*) FROM itempembelian c LEFT JOIN pembelian p ON p.kode=c.kode WHERE p.kode IS NULL",
    "itempenjualan_to_barang": "SELECT COUNT(*) FROM itempenjualan c LEFT JOIN barang p ON p.kode=c.kode_barang WHERE p.kode IS NULL",
    "itempembelian_to_barang": "SELECT COUNT(*) FROM itempembelian c LEFT JOIN barang p ON p.kode=c.kode_barang WHERE p.kode IS NULL",
}


def comparable(value):
    value = text(value)
    # MySQL 4.1 exposes DECIMAL as float through modern drivers while MariaDB
    # exposes Decimal. Canonical numeric text prevents a driver-type mismatch.
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    if isinstance(value, (float, Decimal)):
        normalized = Decimal(str(value)).normalize()
        return "0" if normalized == 0 else format(normalized, "f")
    return value


def query_one(conn, sql: str) -> list:
    with conn.cursor() as cur:
        cur.execute(sql)
        return [comparable(v) for v in cur.fetchone()]


def validate(source, target, inventory: dict) -> tuple[dict, bool]:
    report = {"table_counts": {}, "business_metrics": {}, "orphan_checks": {}, "mismatches": []}
    for table in inventory["tables"]:
        name = table["name"]
        source_count = query_one(source, f"SELECT COUNT(*) FROM {quote(name)}")[0]
        target_count = query_one(target, f"SELECT COUNT(*) FROM {quote(name)}")[0]
        match = source_count == target_count
        report["table_counts"][name] = {"source": source_count, "target": target_count, "match": match}
        if not match:
            report["mismatches"].append(f"row_count:{name}")
    for table, expressions in METRICS.items():
        sql = "SELECT " + ", ".join(expressions) + f" FROM {quote(table)}"
        source_values = query_one(source, sql)
        target_values = query_one(target, sql)
        match = source_values == target_values
        report["business_metrics"][table] = {"expressions": expressions, "source": source_values, "target": target_values, "match": match}
        if not match:
            report["mismatches"].append(f"metric:{table}")
    # Report orphans on both sides; equality is required. Non-zero blocks FK promotion but does not imply copy corruption.
    for name, sql in ORPHANS.items():
        source_value = query_one(source, sql)[0]
        target_value = query_one(target, sql)[0]
        match = source_value == target_value
        report["orphan_checks"][name] = {"source": source_value, "target": target_value, "match": match, "safe_for_fk": source_value == 0 and target_value == 0}
        if not match:
            report["mismatches"].append(f"orphan:{name}")
    return report, not report["mismatches"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Fail-closed source/target reconciliation")
    parser.add_argument("--output", default=str(GENERATED / "validation_report.json"))
    args = parser.parse_args()
    inventory = json.loads((GENERATED / "schema_inventory.json").read_text(encoding="utf-8"))
    ensure_distinct_endpoints(source_config(), target_config())
    source = source_connection()
    try:
        target = pymysql.connect(**target_config())
        try:
            report, passed = validate(source, target, inventory)
        finally:
            target.close()
    finally:
        source.close()
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(json.dumps({"passed": passed, "mismatches": report["mismatches"], "output": args.output}, indent=2))
    if not passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
