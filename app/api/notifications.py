from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import User
from app.schemas.notifications import NotificationItem, NotificationPreferencesPayload, PendingInviteItem
from app.services.notifications import get_or_create_notification_preferences, update_notification_preferences


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/preferences", response_model=NotificationPreferencesPayload)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_or_create_notification_preferences(current_user.id, db)


@router.put("/preferences", response_model=NotificationPreferencesPayload)
def put_preferences(
    payload: NotificationPreferencesPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_notification_preferences(current_user.id, payload.model_dump(), db)


@router.get("/", response_model=list[NotificationItem])
def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT id, meeting_id, channel, type, title, message, status, created_at, sent_at, read_at
            FROM notifications
            WHERE user_id = :user_id AND channel = 'in_app'
            ORDER BY created_at DESC, id DESC
            LIMIT :limit
            """
        ),
        {"user_id": current_user.id, "limit": limit},
    ).mappings().all()
    return [dict(row) for row in rows]


@router.post("/{notification_id}/read", response_model=NotificationItem)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.execute(
        text(
            """
            UPDATE notifications
            SET status = 'read', read_at = NOW()
            WHERE id = :notification_id AND user_id = :user_id AND channel = 'in_app'
            RETURNING id, meeting_id, channel, type, title, message, status, created_at, sent_at, read_at
            """
        ),
        {"notification_id": notification_id, "user_id": current_user.id},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.commit()
    return dict(row)


@router.get("/pending-invites", response_model=list[PendingInviteItem])
def list_pending_invites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT
                m.id AS meeting_id,
                m.title,
                COALESCE(creator.first_name || ' ' || creator.last_name, creator.email, 'Organizer') AS organizer_name,
                creator.email AS organizer_email,
                m.start_time,
                m.end_time,
                m.location,
                ma.status AS current_status
            FROM meeting_attendees ma
            JOIN meetings m ON m.id = ma.meeting_id
            LEFT JOIN users creator ON creator.id = m.created_by
            WHERE ma.user_id = :user_id
              AND ma.status = 'invited'
              AND COALESCE(m.status, 'confirmed') <> 'cancelled'
            ORDER BY m.start_time ASC, m.id ASC
            """
        ),
        {"user_id": current_user.id},
    ).mappings().all()
    return [dict(row) for row in rows]
