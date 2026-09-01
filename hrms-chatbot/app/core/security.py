"""
JWT verification only — we do NOT issue tokens here.
The Node.js server issues the token; we just verify it.

Token payload shape (from Node.js server):
    { "id": <user_id>, "role": "<role>", "iat": ..., "exp": ... }
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import Settings, get_settings

bearer_scheme = HTTPBearer(auto_error=True)


class CurrentUser:
    """Identity extracted from the Node.js-issued JWT."""

    def __init__(self, user_id: int, role: str, raw_token: str):
        self.user_id = user_id
        self.role = role
        self.raw_token = raw_token  # forwarded to Node.js API calls

    def __repr__(self) -> str:
        return f"CurrentUser(id={self.user_id}, role={self.role!r})"


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # Node.js token uses "id", fallback to "sub"
    user_id_raw = payload.get("id") or payload.get("sub")
    role = payload.get("role", "employee")

    if user_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user id claim",
        )

    return CurrentUser(user_id=int(user_id_raw), role=role, raw_token=token)
