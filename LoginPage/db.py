import sqlite3
from pathlib import Path

DB_PATH = Path("app.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        organizer_email TEXT NOT NULL,
        start_time TEXT NOT NULL,   -- ISO string e.g. 2026-02-10 14:00
        end_time TEXT NOT NULL,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled'  -- scheduled/cancelled/completed
    )
    """)

    # Seed only if empty
    cur.execute("SELECT COUNT(*) AS c FROM meetings")
    if cur.fetchone()["c"] == 0:
        cur.executemany("""
            INSERT INTO meetings (title, organizer_email, start_time, end_time, location, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            ("Project Kickoff", "daniel@example.com", "2026-02-10 10:00", "2026-02-10 10:30", "Zoom", "scheduled"),
            ("Design Review", "alex@example.com", "2026-02-11 13:00", "2026-02-11 14:00", "Room 302", "scheduled"),
            ("1:1 Check-in", "daniel@example.com", "2026-02-12 09:00", "2026-02-12 09:30", "Teams", "completed"),
            ("Client Sync", "maria@example.com", "2026-02-12 15:00", "2026-02-12 15:45", "Google Meet", "scheduled"),
            ("Retro", "daniel@example.com", "2026-02-14 11:00", "2026-02-14 12:00", "Room 101", "cancelled"),
        ])

    conn.commit()
    conn.close()
