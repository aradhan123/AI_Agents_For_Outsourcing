from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import verify_password
from app.models import PasswordCredential, User


router = APIRouter(tags=["web"])
templates = Jinja2Templates(directory="app/templates")


def _push_flash(request: Request, category: str, msg: str) -> None:
    flashes = request.session.get("_flashes", [])
    flashes.append({"category": category, "message": msg})
    request.session["_flashes"] = flashes


def _pop_flashes(request: Request) -> list[dict[str, str]]:
    flashes = request.session.get("_flashes", [])
    request.session["_flashes"] = []
    return flashes


def _current_user(request: Request, db: Session) -> User | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        request.session.clear()
        return None
    return user


@router.get("/", name="web_index")
def index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"messages": _pop_flashes(request)},
    )


@router.post("/login", name="web_login")
def web_login(request: Request, email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    email_norm = email.strip().lower()
    user = db.execute(select(User).where(User.email == email_norm)).scalar_one_or_none()

    if user is None or not user.is_active:
        _push_flash(request, "error", "Invalid credentials.")
        return RedirectResponse(url="/", status_code=303)

    cred = db.get(PasswordCredential, user.id)
    if cred is None or not verify_password(password, cred.password_hash):
        _push_flash(request, "error", "Invalid credentials.")
        return RedirectResponse(url="/", status_code=303)

    request.session["user_id"] = user.id
    _push_flash(request, "success", f"Signed in as {user.email}")
    return RedirectResponse(url="/meetings", status_code=303)


@router.get("/dashboard", name="web_dashboard")
def dashboard(request: Request, db: Session = Depends(get_db)):
    user = _current_user(request, db)
    if user is None:
        _push_flash(request, "error", "Please sign in first.")
        return RedirectResponse(url="/", status_code=303)
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={"email": user.email, "messages": _pop_flashes(request)},
    )


@router.get("/meetings", name="web_meetings")
def meetings(
    request: Request,
    db: Session = Depends(get_db),
    q: str = "",
    status: str = "",
    mine: str = "",
):
    user = _current_user(request, db)
    if user is None:
        _push_flash(request, "error", "Please sign in first.")
        return RedirectResponse(url="/", status_code=303)

    status_norm = status.strip().lower()
    mine_enabled = mine.strip() == "1"
    q_norm = q.strip()

    sql = """
        SELECT
            m.id,
            m.title,
            COALESCE(u.email, 'group-calendar') AS organizer_email,
            m.start_time,
            m.end_time,
            m.location,
            CASE
                WHEN m.end_time < NOW() THEN 'completed'
                ELSE 'scheduled'
            END AS status
        FROM meetings m
        JOIN calendars c ON c.id = m.calendar_id
        LEFT JOIN users u ON c.owner_type = 'user' AND c.owner_id = u.id
        WHERE 1=1
    """
    params: dict[str, object] = {}

    if q_norm:
        sql += " AND (m.title ILIKE :q OR COALESCE(m.location, '') ILIKE :q OR COALESCE(u.email, '') ILIKE :q)"
        params["q"] = f"%{q_norm}%"

    if status_norm in {"scheduled", "completed"}:
        if status_norm == "completed":
            sql += " AND m.end_time < NOW()"
        if status_norm == "scheduled":
            sql += " AND m.end_time >= NOW()"

    if mine_enabled:
        sql += " AND COALESCE(u.email, '') = :email"
        params["email"] = user.email

    sql += " ORDER BY m.start_time ASC"
    rows = db.execute(text(sql), params).mappings().all()

    return templates.TemplateResponse(
        request=request,
        name="meetings.html",
        context={
            "meetings": rows,
            "q": q_norm,
            "status": status_norm,
            "mine": mine_enabled,
            "email": user.email,
            "messages": _pop_flashes(request),
        },
    )


@router.get("/meetings/{meeting_id}", name="web_meeting_detail")
def meeting_detail(meeting_id: int, request: Request, db: Session = Depends(get_db)):
    user = _current_user(request, db)
    if user is None:
        _push_flash(request, "error", "Please sign in first.")
        return RedirectResponse(url="/", status_code=303)

    row = db.execute(
        text(
            """
            SELECT
                m.id,
                m.title,
                COALESCE(u.email, 'group-calendar') AS organizer_email,
                m.start_time,
                m.end_time,
                m.location,
                CASE
                    WHEN m.end_time < NOW() THEN 'completed'
                    ELSE 'scheduled'
                END AS status
            FROM meetings m
            JOIN calendars c ON c.id = m.calendar_id
            LEFT JOIN users u ON c.owner_type = 'user' AND c.owner_id = u.id
            WHERE m.id = :meeting_id
            """
        ),
        {"meeting_id": meeting_id},
    ).mappings().one_or_none()

    if row is None:
        _push_flash(request, "error", "Meeting not found.")
        return RedirectResponse(url="/meetings", status_code=303)

    return templates.TemplateResponse(
        request=request,
        name="meeting_detail.html",
        context={"meeting": row, "messages": _pop_flashes(request)},
    )


@router.post("/logout", name="web_logout")
def logout(request: Request):
    request.session.clear()
    _push_flash(request, "success", "Signed out.")
    return RedirectResponse(url="/", status_code=303)


@router.get("/web/auth/google", name="web_auth_google")
def auth_google(request: Request):
    _push_flash(request, "error", "Google OAuth UI flow is not wired in this page yet.")
    return RedirectResponse(url="/", status_code=303)


@router.get("/web/auth/microsoft", name="web_auth_microsoft")
def auth_microsoft(request: Request):
    _push_flash(request, "error", "Microsoft OAuth flow is not wired yet.")
    return RedirectResponse(url="/", status_code=303)
