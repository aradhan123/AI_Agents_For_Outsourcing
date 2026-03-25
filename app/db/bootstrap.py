from sqlalchemy import text

from app.db.session import SessionLocal


BOOTSTRAP_STATEMENTS = [
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#3498db'",
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed'",
    (
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by "
        "INTEGER REFERENCES users(id) ON DELETE SET NULL"
    ),
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
]


def ensure_runtime_schema() -> None:
    db = SessionLocal()
    try:
        for statement in BOOTSTRAP_STATEMENTS:
            db.execute(text(statement))
        db.commit()
    finally:
        db.close()
