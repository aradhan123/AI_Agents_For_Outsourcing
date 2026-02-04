import base64
import hashlib
import os
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(*, user_id: int) -> str:
    now = datetime.now(UTC)
    exp = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc

    if payload.get("type") != "access":
        raise ValueError("Invalid token type")

    sub = payload.get("sub")
    if not sub or not str(sub).isdigit():
        raise ValueError("Invalid token subject")
    return int(sub)


def _pepper() -> bytes:
    return settings.jwt_secret.encode("utf-8")


def generate_refresh_token() -> str:
    raw = os.urandom(48)
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def hash_refresh_token(token: str) -> str:
    # Hash with a server-side secret so DB leaks don't become token leaks.
    h = hashlib.sha256()
    h.update(token.encode("utf-8"))
    h.update(_pepper())
    return h.hexdigest()
