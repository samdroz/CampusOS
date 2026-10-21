import os
import re
import sys
from typing import Optional
from urllib.parse import urlparse
from fastapi import Request, HTTPException, status
from starlette.middleware.cors import CORSMiddleware
from starlette.types import Scope, Receive, Send

ALLOWED_ORIGIN_REGEX = re.compile(r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$", re.IGNORECASE)
ALLOWED_STATIC_ORIGINS = {
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
}

CSRF_CUSTOM_HEADER = "x-campusos-request"
DEFAULT_DESKTOP_PORT = 18420

def is_desktop_mode() -> bool:
    """Returns True if the runtime is running in packaged desktop mode."""
    return getattr(sys, "frozen", False) or os.environ.get("CAMPUSOS_DESKTOP") == "1"

def get_expected_desktop_port(scope: Optional[dict] = None) -> Optional[int]:
    """
    Resolves the expected desktop port without trusting client-supplied headers.
    Priority:
    1. Explicit CAMPUSOS_DESKTOP_PORT from environment (set by launcher or desktop_entry)
    2. Server listening socket from ASGI scope ('server' tuple populated by server runtime)
    3. Default designated desktop port (18420) if desktop mode is active
    """
    val = os.environ.get("CAMPUSOS_DESKTOP_PORT")
    if val:
        try:
            return int(val)
        except ValueError:
            pass

    if scope:
        server = scope.get("server")
        if server and len(server) >= 2:
            try:
                server_port = int(server[1])
                # Starlette TestClient default is ('testserver', 80)
                if server_port > 0 and server_port != 80:
                    return server_port
            except (ValueError, TypeError):
                pass

    if is_desktop_mode():
        return DEFAULT_DESKTOP_PORT

    return None

def is_allowed_origin(origin: str, expected_port: Optional[int] = None) -> bool:
    """
    Validates whether an Origin or Referer matches the trusted CampusOS frontend.

    Desktop mode (packaged application):
    - Strictly enforces the actual assigned port on 127.0.0.1 or localhost,
      preventing unrelated local services or ports (e.g. localhost:3000) from
      accessing the CampusOS backend.
    - Permits legitimate Tauri origins (tauri://localhost, etc.).

    Development mode:
    - Permits configured development origins (e.g. Vite dev on 5173, 4173) and
      local loopback origins for developer convenience.
    """
    if not origin:
        return False

    norm = origin.strip().rstrip("/")
    if norm.lower() in ALLOWED_STATIC_ORIGINS:
        return True

    if is_desktop_mode():
        target_port = expected_port if expected_port is not None else get_expected_desktop_port()
        try:
            parsed = urlparse(norm)
            if parsed.scheme not in ("http", "https"):
                return False
            if parsed.hostname not in ("127.0.0.1", "localhost"):
                return False
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            if target_port is not None:
                return port == target_port
            return bool(ALLOWED_ORIGIN_REGEX.match(norm))
        except Exception:
            return False

    # Development mode: allow configured dev origins or any local loopback origin
    try:
        from backend.app.core.config import settings
        if norm in settings.CORS_ORIGINS:
            return True
    except Exception:
        pass
    return bool(ALLOWED_ORIGIN_REGEX.match(norm))

class CampusOSCORSMiddleware(CORSMiddleware):
    """
    CORS middleware that dynamically enforces CampusOS origin policy.
    In packaged desktop mode, restricts access strictly to the assigned
    desktop loopback port and Tauri schemes, blocking unrelated localhost
    ports and external origins on both preflights and simple requests.
    """
    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            server = scope.get("server")
            if server and len(server) >= 2:
                try:
                    port = int(server[1])
                    if port > 0 and port != 80 and not os.environ.get("CAMPUSOS_DESKTOP_PORT"):
                        os.environ["CAMPUSOS_DESKTOP_PORT"] = str(port)
                except (ValueError, TypeError):
                    pass
        await super().__call__(scope, receive, send)

    def is_allowed_origin(self, origin: str) -> bool:
        return is_allowed_origin(origin)

def verify_csrf_protection(request: Request) -> None:
    """
    Validates that state-changing requests originate from the trusted local CampusOS client
    and cannot be forged by external websites via basic HTML forms or cross-origin scripts.

    Safeguards:
    1. Origin / Referer validation: If present, must strictly match legitimate CampusOS frontend.
       In desktop mode, requests from unrelated localhost ports (e.g. 3000) or external origins
       (e.g. attacker.com) are rejected with 403 Forbidden.
    2. Fail-closed: If both Origin and Referer are absent, rejected with 403 Forbidden.
    3. Custom request header validation: The request must include 'X-CampusOS-Request: 1'.
    """
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")

    if not origin and not referer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing required origin verification headers.",
        )

    expected_port = get_expected_desktop_port(request.scope)

    if origin:
        if not is_allowed_origin(origin, expected_port=expected_port):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-origin request rejected.",
            )

    if referer:
        try:
            parsed = urlparse(referer)
            ref_origin = f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Malformed referer header.",
            )
        if not is_allowed_origin(ref_origin, expected_port=expected_port):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-origin request rejected.",
            )

    custom_header = request.headers.get(CSRF_CUSTOM_HEADER)
    if not custom_header or custom_header.strip() != "1":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid security header 'X-CampusOS-Request'.",
        )
