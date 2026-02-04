from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models import GroupMembership, User


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_id = decode_access_token(creds.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_group_role(*allowed_roles: str):
    allowed = set(allowed_roles)

    def _dep(group_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> GroupMembership:
        gm = db.execute(
            select(GroupMembership).where(GroupMembership.group_id == group_id, GroupMembership.user_id == user.id)
        ).scalar_one_or_none()

        if gm is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        if allowed and gm.role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return gm

    return _dep


def require_self(user_id: int, user: User = Depends(get_current_user)) -> User:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
