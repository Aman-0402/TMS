"""
Thin compatibility shim for Django 5 + MariaDB 10.4.

Django 5 requires MariaDB ≥ 10.5 because it uses:
  • INSERT … RETURNING (10.5+)
  • Atomic DDL (10.5+)

This shim disables those two features so Django falls back to the
older, compatible code paths that work on MariaDB 10.4.

Upgrade MariaDB/XAMPP to 10.5+ and delete this file when convenient.
"""
from django.db.backends.mysql.base import DatabaseWrapper as _Base
from django.db.backends.mysql.features import DatabaseFeatures as _BaseFeatures


class DatabaseFeatures(_BaseFeatures):
    # MariaDB 10.4 does not support INSERT … RETURNING.
    can_return_columns_from_insert = False
    can_return_rows_from_bulk_insert = False

    # MariaDB 10.4 does not have fully atomic DDL.
    has_atomic_references_rename = False


class DatabaseWrapper(_Base):
    features_class = DatabaseFeatures

    def check_database_version_supported(self):
        # Skip the ≥ 10.5 enforcement — 10.4 works for everything TMS uses.
        pass
