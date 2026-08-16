import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from common import ensure_distinct_endpoints, normalize_create_table, normalize_value
from validate import comparable


class TransformTests(unittest.TestCase):
    def test_engine_charset_and_zero_default(self):
        legacy = "CREATE TABLE `x` (\n `d` date default '0000-00-00'\n) ENGINE=MyISAM DEFAULT CHARSET=latin1"
        result = normalize_create_table(legacy, "x", True)
        self.assertIn("ENGINE=InnoDB", result)
        self.assertIn("DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", result)
        self.assertIn("DEFAULT NULL", result)

    def test_surrogate_pk_only_when_missing(self):
        legacy = "CREATE TABLE `x` (\n `name` varchar(10)\n) ENGINE=MyISAM DEFAULT CHARSET=latin1"
        result = normalize_create_table(legacy, "x", False)
        self.assertIn("`app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT", result)
        self.assertIn("PRIMARY KEY (`app_row_id`)", result)

    def test_zero_date_value_becomes_null(self):
        self.assertIsNone(normalize_value("0000-00-00", "date"))
        self.assertEqual("0000-00-00", normalize_value("0000-00-00", "varchar(10)"))

    def test_legacy_boolean_is_preserved(self):
        self.assertEqual("False", normalize_value(b"False", "varchar(5)"))

    def test_same_endpoint_is_refused(self):
        cfg = {"host": "127.0.0.1", "port": 3306, "database": "toko_1_3"}
        with self.assertRaises(RuntimeError):
            ensure_distinct_endpoints(cfg, dict(cfg))

    def test_cross_driver_decimals_compare(self):
        from decimal import Decimal
        self.assertEqual(comparable(10.0), comparable(Decimal("10.00")))


if __name__ == "__main__":
    unittest.main()
