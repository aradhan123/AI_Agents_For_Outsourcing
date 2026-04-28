from sqlalchemy import text

from app.db.session import SessionLocal


def register_user(client, *, first_name: str, last_name: str, email: str, password: str = "supersecret123"):
    response = client.post(
        "/auth/register",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password": password,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_notification_preferences_round_trip(client):
    token = register_user(client, first_name="Ada", last_name="Lovelace", email="ada@example.com")

    get_response = client.get("/notifications/preferences", headers=auth_headers(token))
    assert get_response.status_code == 200, get_response.text
    assert get_response.json()["email"] is True
    assert get_response.json()["in_app"] is True

    update_response = client.put(
        "/notifications/preferences",
        headers=auth_headers(token),
        json={
            "email": False,
            "in_app": True,
            "meeting_reminders": False,
            "group_activity": False,
            "weekly_digest": True,
            "digest_frequency": "daily",
            "quiet_hours_enabled": True,
            "quiet_hours_start": "21:00:00",
            "quiet_hours_end": "07:00:00",
        },
    )
    assert update_response.status_code == 200, update_response.text
    payload = update_response.json()
    assert payload["email"] is False
    assert payload["weekly_digest"] is True
    assert payload["digest_frequency"] == "daily"


def test_notifications_created_for_invite_update_cancel(client):
    organizer_token = register_user(client, first_name="Ada", last_name="Lovelace", email="ada@example.com")
    attendee_token = register_user(client, first_name="Grace", last_name="Hopper", email="grace@example.com")

    create_response = client.post(
        "/meetings/",
        headers=auth_headers(organizer_token),
        json={
            "title": "Sprint Planning",
            "description": "Plan the next sprint",
            "location": "Lab A",
            "meeting_type": "in_person",
            "start_time": "2026-04-21T14:00:00Z",
            "end_time": "2026-04-21T15:00:00Z",
            "attendee_emails": ["grace@example.com"],
        },
    )
    assert create_response.status_code == 200, create_response.text
    meeting_id = create_response.json()["id"]

    pending_invites = client.get("/notifications/pending-invites", headers=auth_headers(attendee_token))
    assert pending_invites.status_code == 200, pending_invites.text
    assert len(pending_invites.json()) == 1
    assert pending_invites.json()[0]["meeting_id"] == meeting_id

    in_app_notifications = client.get("/notifications/", headers=auth_headers(attendee_token))
    assert in_app_notifications.status_code == 200, in_app_notifications.text
    notifications = in_app_notifications.json()
    assert len(notifications) == 1
    assert notifications[0]["type"] == "invite"
    assert notifications[0]["status"] == "sent"

    mark_read_response = client.post(
        f"/notifications/{notifications[0]['id']}/read",
        headers=auth_headers(attendee_token),
    )
    assert mark_read_response.status_code == 200, mark_read_response.text
    assert mark_read_response.json()["status"] == "read"

    update_response = client.put(
        f"/meetings/{meeting_id}",
        headers=auth_headers(organizer_token),
        json={
            "location": "Lab B",
            "start_time": "2026-04-21T16:00:00Z",
            "end_time": "2026-04-21T17:00:00Z",
        },
    )
    assert update_response.status_code == 200, update_response.text

    cancel_response = client.post(
        f"/meetings/{meeting_id}/cancel",
        headers=auth_headers(organizer_token),
    )
    assert cancel_response.status_code == 200, cancel_response.text

    refreshed_notifications = client.get("/notifications/", headers=auth_headers(attendee_token))
    assert refreshed_notifications.status_code == 200, refreshed_notifications.text
    refreshed_payload = refreshed_notifications.json()
    assert [item["type"] for item in refreshed_payload[:3]] == ["cancel", "update", "invite"]

    pending_after_cancel = client.get("/notifications/pending-invites", headers=auth_headers(attendee_token))
    assert pending_after_cancel.status_code == 200, pending_after_cancel.text
    assert pending_after_cancel.json() == []

    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
            SELECT channel, type, status
            FROM notifications
            WHERE user_id = 2
            ORDER BY id ASC
            """
            )
        ).fetchall()
    finally:
        db.close()

    assert rows[0] == ("in_app", "invite", "read")
    assert rows[2] == ("in_app", "update", "sent")
    assert rows[4] == ("in_app", "cancel", "sent")
    assert rows[1][0:2] == ("email", "invite")
    assert rows[3][0:2] == ("email", "update")
    assert rows[5][0:2] == ("email", "cancel")
    assert rows[1][2] in {"sent", "skipped"}
    assert rows[3][2] in {"sent", "skipped"}
    assert rows[5][2] in {"sent", "skipped"}


def test_invite_message_uses_location_or_meeting_link(client):
    organizer_token = register_user(client, first_name="Ada", last_name="Lovelace", email="ada@example.com")
    register_user(client, first_name="Grace", last_name="Hopper", email="grace@example.com")

    in_person_response = client.post(
        "/meetings/",
        headers=auth_headers(organizer_token),
        json={
            "title": "SD Meeting",
            "location": "Scott Hall",
            "meeting_type": "in_person",
            "start_time": "2026-04-23T11:00:00Z",
            "end_time": "2026-04-23T12:00:00Z",
            "attendee_emails": ["grace@example.com"],
        },
    )
    assert in_person_response.status_code == 200, in_person_response.text

    db = SessionLocal()
    try:
        in_person_message = db.execute(
            text(
                """
                SELECT message
                FROM notifications
                WHERE user_id = 2 AND channel = 'email' AND type = 'invite'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).scalar_one()
    finally:
        db.close()

    assert "Location: Scott Hall" in in_person_message
    assert "Meeting link:" not in in_person_message

    client.post(
        "/meetings/",
        headers=auth_headers(organizer_token),
        json={
            "title": "Remote SD Meeting",
            "location": "https://zoom.example.com/meeting-123",
            "meeting_type": "virtual",
            "start_time": "2026-04-24T11:00:00Z",
            "end_time": "2026-04-24T12:00:00Z",
            "attendee_emails": ["grace@example.com"],
        },
    )

    db = SessionLocal()
    try:
        virtual_message = db.execute(
            text(
                """
                SELECT message
                FROM notifications
                WHERE user_id = 2 AND channel = 'email' AND type = 'invite'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).scalar_one()
    finally:
        db.close()

    assert "Meeting link: https://zoom.example.com/meeting-123" in virtual_message
    assert "Location:" not in virtual_message
