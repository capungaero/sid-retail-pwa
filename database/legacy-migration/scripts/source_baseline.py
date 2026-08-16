from __future__ import annotations

import json

from common import GENERATED, quote, source_connection, text
from validate import METRICS, ORPHANS, comparable, query_one


def main() -> None:
    inventory = json.loads((GENERATED / "schema_inventory.json").read_text(encoding="utf-8"))
    report = {"source": inventory["source"], "table_count": inventory["table_count"], "total_rows": 0, "table_counts": {}, "business_metrics": {}, "orphan_checks": {}, "zero_date_counts": {}}
    connection = source_connection()
    try:
        for table in inventory["tables"]:
            name = table["name"]
            count = query_one(connection, f"SELECT COUNT(*) FROM {quote(name)}")[0]
            report["table_counts"][name] = count
            report["total_rows"] += count
            for column in table["columns"]:
                column_type = column["type"].lower()
                if "date" in column_type or "timestamp" in column_type:
                    key = f"{name}.{column['name']}"
                    sql = f"SELECT COUNT(*) FROM {quote(name)} WHERE {quote(column['name'])}='0000-00-00'"
                    zero_count = query_one(connection, sql)[0]
                    if zero_count:
                        report["zero_date_counts"][key] = zero_count
        for table, expressions in METRICS.items():
            sql = "SELECT " + ", ".join(expressions) + f" FROM {quote(table)}"
            report["business_metrics"][table] = {"expressions": expressions, "values": query_one(connection, sql)}
        for name, sql in ORPHANS.items():
            report["orphan_checks"][name] = query_one(connection, sql)[0]
    finally:
        connection.close()
    GENERATED.mkdir(parents=True, exist_ok=True)
    output = GENERATED / "source_baseline.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "tables": report["table_count"], "rows": report["total_rows"], "zero_dates": sum(report["zero_date_counts"].values()), "orphan_checks": report["orphan_checks"], "business_metrics": report["business_metrics"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

