from __future__ import annotations

import logging
from datetime import datetime, timezone

import requests
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings


logger = logging.getLogger("app.notifications")


DEFAULT_NOTIFICATION_PREFERENCES = {
    "email": True,
    "in_app": True,
    "meeting_reminders": True,
    "group_activity": True,
    "weekly_digest": False,
    "digest_frequency": "weekly",
    "quiet_hours_enabled": False,
    "quiet_hours_start": None,
    "quiet_hours_end": None,
}


def get_or_create_notification_preferences(user_id: int, db: Session) -> dict:
    row = db.execute(
        text(
            """
            SELECT
                user_id,
                email_enabled,
                in_app_enabled,
                meeting_reminders_enabled,
                group_activity_enabled,
                weekly_digest_enabled,
                digest_frequency,
                quiet_hours_enabled,
                quiet_hours_start,
                quiet_hours_end
            FROM notification_preferences
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings().first()

    if row is None:
        db.execute(
            text(
                """
                INSERT INTO notification_preferences (
                    user_id,
                    email_enabled,
                    in_app_enabled,
                    meeting_reminders_enabled,
                    group_activity_enabled,
                    weekly_digest_enabled,
                    digest_frequency,
                    quiet_hours_enabled,
                    quiet_hours_start,
                    quiet_hours_end
                )
                VALUES (
                    :user_id,
                    :email_enabled,
                    :in_app_enabled,
                    :meeting_reminders_enabled,
                    :group_activity_enabled,
                    :weekly_digest_enabled,
                    :digest_frequency,
                    :quiet_hours_enabled,
                    :quiet_hours_start,
                    :quiet_hours_end
                )
                """
            ),
            {
                "user_id": user_id,
                "email_enabled": DEFAULT_NOTIFICATION_PREFERENCES["email"],
                "in_app_enabled": DEFAULT_NOTIFICATION_PREFERENCES["in_app"],
                "meeting_reminders_enabled": DEFAULT_NOTIFICATION_PREFERENCES["meeting_reminders"],
                "group_activity_enabled": DEFAULT_NOTIFICATION_PREFERENCES["group_activity"],
                "weekly_digest_enabled": DEFAULT_NOTIFICATION_PREFERENCES["weekly_digest"],
                "digest_frequency": DEFAULT_NOTIFICATION_PREFERENCES["digest_frequency"],
                "quiet_hours_enabled": DEFAULT_NOTIFICATION_PREFERENCES["quiet_hours_enabled"],
                "quiet_hours_start": DEFAULT_NOTIFICATION_PREFERENCES["quiet_hours_start"],
                "quiet_hours_end": DEFAULT_NOTIFICATION_PREFERENCES["quiet_hours_end"],
            },
        )
        db.commit()
        return DEFAULT_NOTIFICATION_PREFERENCES.copy()

    return {
        "email": row["email_enabled"],
        "in_app": row["in_app_enabled"],
        "meeting_reminders": row["meeting_reminders_enabled"],
        "group_activity": row["group_activity_enabled"],
        "weekly_digest": row["weekly_digest_enabled"],
        "digest_frequency": row["digest_frequency"],
        "quiet_hours_enabled": row["quiet_hours_enabled"],
        "quiet_hours_start": row["quiet_hours_start"],
        "quiet_hours_end": row["quiet_hours_end"],
    }


def update_notification_preferences(user_id: int, payload: dict, db: Session) -> dict:
    get_or_create_notification_preferences(user_id, db)
    db.execute(
        text(
            """
            UPDATE notification_preferences
            SET
                email_enabled = :email_enabled,
                in_app_enabled = :in_app_enabled,
                meeting_reminders_enabled = :meeting_reminders_enabled,
                group_activity_enabled = :group_activity_enabled,
                weekly_digest_enabled = :weekly_digest_enabled,
                digest_frequency = :digest_frequency,
                quiet_hours_enabled = :quiet_hours_enabled,
                quiet_hours_start = :quiet_hours_start,
                quiet_hours_end = :quiet_hours_end,
                updated_at = NOW()
            WHERE user_id = :user_id
            """
        ),
        {
            "user_id": user_id,
            "email_enabled": payload["email"],
            "in_app_enabled": payload["in_app"],
            "meeting_reminders_enabled": payload["meeting_reminders"],
            "group_activity_enabled": payload["group_activity"],
            "weekly_digest_enabled": payload["weekly_digest"],
            "digest_frequency": payload["digest_frequency"],
            "quiet_hours_enabled": payload["quiet_hours_enabled"],
            "quiet_hours_start": payload["quiet_hours_start"],
            "quiet_hours_end": payload["quiet_hours_end"],
        },
    )
    db.commit()
    return get_or_create_notification_preferences(user_id, db)


def _insert_notification(
    *,
    user_id: int,
    meeting_id: int | None,
    channel: str,
    notification_type: str,
    title: str,
    message: str,
    status: str,
    db: Session,
    provider_message_id: str | None = None,
    error_message: str | None = None,
    sent_at: datetime | None = None,
) -> int:
    row = db.execute(
        text(
            """
            INSERT INTO notifications (
                user_id,
                meeting_id,
                channel,
                type,
                title,
                message,
                status,
                provider_message_id,
                error_message,
                sent_at
            )
            VALUES (
                :user_id,
                :meeting_id,
                :channel,
                :type,
                :title,
                :message,
                :status,
                :provider_message_id,
                :error_message,
                :sent_at
            )
            RETURNING id
            """
        ),
        {
            "user_id": user_id,
            "meeting_id": meeting_id,
            "channel": channel,
            "type": notification_type,
            "title": title,
            "message": message,
            "status": status,
            "provider_message_id": provider_message_id,
            "error_message": error_message,
            "sent_at": sent_at,
        },
    ).fetchone()
    return row[0]


def create_in_app_notification(
    *,
    user_id: int,
    meeting_id: int | None,
    notification_type: str,
    title: str,
    message: str,
    db: Session,
) -> None:
    _insert_notification(
        user_id=user_id,
        meeting_id=meeting_id,
        channel="in_app",
        notification_type=notification_type,
        title=title,
        message=message,
        status="sent",
        db=db,
        sent_at=datetime.now(timezone.utc),
    )


def send_email_notification(
    *,
    user_id: int,
    recipient_email: str,
    meeting_id: int | None,
    notification_type: str,
    subject: str,
    message: str,
    db: Session,
) -> None:
    sent_at = datetime.now(timezone.utc)

    if not settings.resend_api_key or not settings.email_from_address:
        logger.info(
            "Skipping email send; Resend not configured user_id=%s recipient=%s subject=%s message=%s",
            user_id,
            recipient_email,
            subject,
            message,
        )
        _insert_notification(
            user_id=user_id,
            meeting_id=meeting_id,
            channel="email",
            notification_type=notification_type,
            title=subject,
            message=message,
            status="skipped",
            db=db,
            error_message="Resend not configured",
            sent_at=sent_at,
        )
        return

    from_header = settings.email_from_address
    if settings.email_from_name:
        from_header = f"{settings.email_from_name} <{settings.email_from_address}>"

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_header,
                "to": [recipient_email],
                "subject": subject,
                "text": message,
            },
            timeout=15,
        )
        response.raise_for_status()
        provider_message_id = response.json().get("id")
        _insert_notification(
            user_id=user_id,
            meeting_id=meeting_id,
            channel="email",
            notification_type=notification_type,
            title=subject,
            message=message,
            status="sent",
            db=db,
            provider_message_id=provider_message_id,
            sent_at=sent_at,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to send Resend email user_id=%s recipient=%s", user_id, recipient_email)
        _insert_notification(
            user_id=user_id,
            meeting_id=meeting_id,
            channel="email",
            notification_type=notification_type,
            title=subject,
            message=message,
            status="failed",
            db=db,
            error_message=str(exc),
            sent_at=sent_at,
        )


def _load_meeting_context(meeting_id: int, db: Session) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT
                m.id,
                m.title,
                m.location,
                m.meeting_type,
                m.start_time,
                m.end_time,
                creator.first_name AS organizer_first_name,
                creator.last_name AS organizer_last_name,
                creator.email AS organizer_email
            FROM meetings m
            LEFT JOIN users creator ON creator.id = m.created_by
            WHERE m.id = :meeting_id
            """
        ),
        {"meeting_id": meeting_id},
    ).mappings().first()
    return dict(row) if row else None


def _load_notification_recipients(meeting_id: int, db: Session) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT u.id, u.email, u.first_name, u.last_name, ma.status
            FROM meeting_attendees ma
            JOIN users u ON u.id = ma.user_id
            JOIN meetings m ON m.id = ma.meeting_id
            WHERE ma.meeting_id = :meeting_id
              AND u.id <> m.created_by
              AND ma.status <> 'declined'
            ORDER BY u.email ASC
            """
        ),
        {"meeting_id": meeting_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def _format_meeting_window(context: dict) -> str:
    start = context["start_time"].strftime("%a %b %d %I:%M %p")
    end = context["end_time"].strftime("%I:%M %p")
    return f"{start} - {end}"


def _build_invite_message(context: dict, organizer_name: str) -> str:
    details_label = "Meeting link" if context.get("meeting_type") == "virtual" else "Location"
    details_value = context.get("location") or "TBD"
    time_summary = _format_meeting_window(context)
    return (
        f"{organizer_name} invited you to '{context['title']}'.\n"
        f"When: {time_summary}\n"
        f"{details_label}: {details_value}\n"
        f"Manage your RSVP in the app: {settings.app_base_url}/meetings"
    )


def notify_meeting_invite(meeting_id: int, db: Session) -> None:
    context = _load_meeting_context(meeting_id, db)
    if context is None:
        return

    recipients = [recipient for recipient in _load_notification_recipients(meeting_id, db) if recipient["status"] == "invited"]
    organizer_name = " ".join(filter(None, [context.get("organizer_first_name"), context.get("organizer_last_name")])).strip() or "Your organizer"

    for recipient in recipients:
        preferences = get_or_create_notification_preferences(recipient["id"], db)
        subject = f"Meeting invite: {context['title']}"
        message = _build_invite_message(context, organizer_name)

        if preferences["in_app"]:
            create_in_app_notification(
                user_id=recipient["id"],
                meeting_id=meeting_id,
                notification_type="invite",
                title=subject,
                message=message,
                db=db,
            )
        if preferences["email"]:
            send_email_notification(
                user_id=recipient["id"],
                recipient_email=recipient["email"],
                meeting_id=meeting_id,
                notification_type="invite",
                subject=subject,
                message=message,
                db=db,
            )

    db.commit()


def notify_meeting_cancelled(meeting_id: int, db: Session) -> None:
    context = _load_meeting_context(meeting_id, db)
    if context is None:
        return

    recipients = _load_notification_recipients(meeting_id, db)
    subject = f"Meeting cancelled: {context['title']}"
    message = (
        f"'{context['title']}' has been cancelled.\n"
        f"Originally scheduled for: {_format_meeting_window(context)}\n"
        f"Check the app for details: {settings.app_base_url}/meetings"
    )

    for recipient in recipients:
        preferences = get_or_create_notification_preferences(recipient["id"], db)
        if preferences["in_app"]:
            create_in_app_notification(
                user_id=recipient["id"],
                meeting_id=meeting_id,
                notification_type="cancel",
                title=subject,
                message=message,
                db=db,
            )
        if preferences["email"]:
            send_email_notification(
                user_id=recipient["id"],
                recipient_email=recipient["email"],
                meeting_id=meeting_id,
                notification_type="cancel",
                subject=subject,
                message=message,
                db=db,
            )

    db.commit()


def notify_meeting_updated(meeting_id: int, db: Session) -> None:
    context = _load_meeting_context(meeting_id, db)
    if context is None:
        return

    recipients = _load_notification_recipients(meeting_id, db)
    subject = f"Meeting updated: {context['title']}"
    message = (
        f"'{context['title']}' was updated or rescheduled.\n"
        f"New time: {_format_meeting_window(context)}\n"
        f"Location: {context.get('location') or 'TBD'}\n"
        f"Review the update in the app: {settings.app_base_url}/meetings"
    )

    for recipient in recipients:
        preferences = get_or_create_notification_preferences(recipient["id"], db)
        if preferences["in_app"]:
            create_in_app_notification(
                user_id=recipient["id"],
                meeting_id=meeting_id,
                notification_type="update",
                title=subject,
                message=message,
                db=db,
            )
        if preferences["email"] and preferences["meeting_reminders"]:
            send_email_notification(
                user_id=recipient["id"],
                recipient_email=recipient["email"],
                meeting_id=meeting_id,
                notification_type="update",
                subject=subject,
                message=message,
                db=db,
            )

    db.commit()
