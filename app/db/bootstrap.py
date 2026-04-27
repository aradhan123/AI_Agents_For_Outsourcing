from sqlalchemy import text

from app.db.session import SessionLocal


BOOTSTRAP_STATEMENTS = [
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'in_person'",
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#3498db'",
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed'",
    (
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by "
        "INTEGER REFERENCES users(id) ON DELETE SET NULL"
    ),
    "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    "ALTER TABLE meeting_attendees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    """
    CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        meeting_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        group_activity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        weekly_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        digest_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('daily', 'weekly')),
        quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app')),
        type TEXT NOT NULL CHECK (type IN ('invite', 'cancel', 'update', 'rsvp_update')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'read', 'skipped')),
        provider_message_id TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ,
        read_at TIMESTAMPTZ
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_meeting_id ON notifications(meeting_id)",
    """
    DO $$
    DECLARE constraint_name TEXT;
    BEGIN
        SELECT c.conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'meeting_attendees'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%status%'
        LIMIT 1;

        IF constraint_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE meeting_attendees DROP CONSTRAINT %I', constraint_name);
        END IF;

        ALTER TABLE meeting_attendees
        ADD CONSTRAINT meeting_attendees_status_check
        CHECK (status IN ('invited', 'accepted', 'declined', 'maybe'));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$
    """,
]


def ensure_runtime_schema() -> None:
    db = SessionLocal()
    try:
        for statement in BOOTSTRAP_STATEMENTS:
            db.execute(text(statement))
        db.commit()
    finally:
        db.close()
