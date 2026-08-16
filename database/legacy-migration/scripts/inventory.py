from __future__ import annotations

import argparse
import json
from pathlib import Path

from common import GENERATED, normalize_create_table, quote, source_connection, text


def collect(include_counts: bool = True) -> dict:
    conn = source_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT VERSION(), DATABASE(), @@character_set_database")
        version, database, charset = (text(v) for v in cur.fetchone())
        cur.execute("SHOW TABLES")
        tables = sorted(text(row[0]) for row in cur.fetchall())
        result = {"source": {"version": version, "database": database, "charset": charset}, "table_count": len(tables), "tables": []}
        for table in tables:
            cur.execute(f"SHOW FULL COLUMNS FROM {quote(table)}")
            columns = []
            has_pk = False
            for row in cur.fetchall():
                values = [text(v) for v in row]
                column = {"name": values[0], "type": values[1], "collation": values[2], "nullable": values[3] == "YES", "key": values[4], "default": values[5], "extra": values[6], "privileges": values[7], "comment": values[8]}
                has_pk |= column["key"] == "PRI"
                columns.append(column)
            cur.execute(f"SHOW INDEX FROM {quote(table)}")
            indexes = []
            for row in cur.fetchall():
                values = [text(v) for v in row]
                indexes.append({"name": values[2], "unique": values[1] == 0, "sequence": values[3], "column": values[4], "cardinality": values[6], "type": values[10]})
            cur.execute(f"SHOW CREATE TABLE {quote(table)}")
            legacy_ddl = text(cur.fetchone()[1])
            target_ddl = normalize_create_table(legacy_ddl, table, has_pk)
            item = {"name": table, "has_primary_key": has_pk, "columns": columns, "indexes": indexes, "legacy_ddl": legacy_ddl, "target_ddl": target_ddl}
            if include_counts:
                cur.execute(f"SELECT COUNT(*) FROM {quote(table)}")
                item["row_count"] = cur.fetchone()[0]
            result["tables"].append(item)
        return result
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only SID legacy schema inventory")
    parser.add_argument("--no-counts", action="store_true")
    args = parser.parse_args()
    GENERATED.mkdir(parents=True, exist_ok=True)
    inventory = collect(not args.no_counts)
    (GENERATED / "schema_inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    schema = "-- Generated from read-only SHOW CREATE TABLE; contains no row data.\nSET NAMES utf8mb4;\n\n" + ";\n\n".join(table["target_ddl"] for table in inventory["tables"]) + ";\n"
    (GENERATED / "target_schema.sql").write_text(schema, encoding="utf-8")
    summary = {"source": inventory["source"], "table_count": inventory["table_count"], "tables_without_pk": [t["name"] for t in inventory["tables"] if not t["has_primary_key"]], "total_rows": sum(t.get("row_count", 0) for t in inventory["tables"])}
    (GENERATED / "inventory_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
