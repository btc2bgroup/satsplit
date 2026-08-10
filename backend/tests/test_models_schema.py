"""Schema consistency checks that SQLite cannot catch.

The unit suite runs on SQLite, which happily accepts a timezone-aware datetime into a
naive DATETIME column. Postgres does not: binding an aware datetime to a
`TIMESTAMP WITHOUT TIME ZONE` parameter fails at runtime. Every migration declares
`DateTime(timezone=True)`, so the ORM must agree.
"""

from sqlalchemy import DateTime

from app.models import Base


def _datetime_columns():
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, DateTime):
                yield f"{table.name}.{column.name}", column


def test_all_datetime_columns_are_timezone_aware():
    naive = [name for name, column in _datetime_columns() if not column.type.timezone]
    assert naive == [], (
        f"These columns map to TIMESTAMP WITHOUT TIME ZONE but the migrations create them "
        f"as timestamptz: {naive}. Writing an aware datetime to them fails on Postgres."
    )


def test_verify_timestamp_columns_exist():
    columns = Base.metadata.tables["participants"].columns
    for name in ("verify_url", "preimage", "verified_at", "last_verify_check_at"):
        assert name in columns
