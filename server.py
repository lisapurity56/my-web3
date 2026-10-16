#!/usr/bin/env python3
import json
import os
import re
import smtplib
import ssl
import sqlite3
import sys
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent


def load_env_file(path=None):
    env_path = Path(path) if path is not None else ROOT / ".env"
    try:
        lines = env_path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return

    for line_number, line in enumerate(lines, start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            raise ValueError(f"Invalid environment variable in {env_path}:{line_number}.")

        value = value.strip()
        if value.startswith(("'", '"')):
            match = re.fullmatch(r"""(['"])(.*?)\1(?:\s+#.*)?""", value)
            if not match:
                raise ValueError(f"Unclosed quoted value in {env_path}:{line_number}.")
            value = match.group(2)
        else:
            value = re.split(r"\s+#", value, maxsplit=1)[0].rstrip()
        os.environ.setdefault(key, value)


load_env_file()

DB_PATH = Path(os.environ.get("JOLIZA_DB_PATH", ROOT / "data" / "inquiries.sqlite3"))
if not DB_PATH.is_absolute():
    DB_PATH = ROOT / DB_PATH

MAX_BODY_BYTES = 16 * 1024
RATE_LIMIT_COUNT = 5
RATE_LIMIT_WINDOW_SECONDS = 10 * 60
SMTP_TIMEOUT_SECONDS = 10
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ALLOWED_INQUIRY_TYPES = {"general", "order", "stockist"}
STATIC_FILES = {
    "index.html",
    "script.js",
    "styles.css",
    "joliza-logo.png",
    "joliza flyer.png",
}
recent_submissions = defaultdict(deque)


@dataclass(frozen=True)
class EmailSettings:
    host: str
    port: int
    sender: str
    recipient: str
    username: str
    password: str


def load_email_settings():
    host = os.environ.get("JOLIZA_SMTP_HOST", "").strip()
    sender = os.environ.get("JOLIZA_EMAIL_FROM", "").strip()
    recipient = os.environ.get("JOLIZA_NOTIFY_EMAIL", "lisapurity56@gmail.com").strip()
    username = os.environ.get("JOLIZA_SMTP_USERNAME", "")
    password = os.environ.get("JOLIZA_SMTP_PASSWORD", "")
    configured = any((host, sender, username, password))
    if not configured:
        return None
    if not host or not sender or not recipient:
        raise ValueError(
            "Set JOLIZA_SMTP_HOST, JOLIZA_EMAIL_FROM, and JOLIZA_NOTIFY_EMAIL "
            "to enable email notifications."
        )
    if any(character.isspace() for character in host):
        raise ValueError("JOLIZA_SMTP_HOST must be a valid host name without spaces.")
    if not EMAIL_PATTERN.fullmatch(sender) or not EMAIL_PATTERN.fullmatch(recipient):
        raise ValueError("JOLIZA_EMAIL_FROM and JOLIZA_NOTIFY_EMAIL must be valid email addresses.")
    if bool(username) != bool(password):
        raise ValueError("Set both JOLIZA_SMTP_USERNAME and JOLIZA_SMTP_PASSWORD, or neither.")
    try:
        port = int(os.environ.get("JOLIZA_SMTP_PORT", "587"))
    except ValueError as error:
        raise ValueError("JOLIZA_SMTP_PORT must be a number between 1 and 65535.") from error
    if not 1 <= port <= 65535:
        raise ValueError("JOLIZA_SMTP_PORT must be a number between 1 and 65535.")
    return EmailSettings(host, port, sender, recipient, username, password)


def send_inquiry_notification(settings, inquiry_id, inquiry_type, name, email, message):
    if settings is None:
        return False

    notification = EmailMessage()
    notification["Subject"] = f"Joliza website inquiry #{inquiry_id}: {inquiry_type}"
    notification["From"] = settings.sender
    notification["To"] = settings.recipient
    notification["Reply-To"] = email
    notification.set_content(
        f"Inquiry #{inquiry_id}\n"
        f"Type: {inquiry_type}\n"
        f"Name: {name}\n"
        f"Email: {email}\n\n"
        f"{message}\n"
    )

    context = ssl.create_default_context()
    if settings.port == 465:
        with smtplib.SMTP_SSL(
            settings.host, settings.port, timeout=SMTP_TIMEOUT_SECONDS, context=context
        ) as smtp:
            if settings.username:
                smtp.login(settings.username, settings.password)
            smtp.send_message(notification)
    else:
        with smtplib.SMTP(settings.host, settings.port, timeout=SMTP_TIMEOUT_SECONDS) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            if settings.username:
                smtp.login(settings.username, settings.password)
            smtp.send_message(notification)
    return True


def connect_database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inquiry_type TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.commit()
    try:
        DB_PATH.chmod(0o600)
    except OSError:
        connection.close()
        raise
    return connection


def send_json(handler, status, payload, head_only=False):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.end_headers()
    if not head_only:
        handler.wfile.write(body)


def is_static_asset(path):
    asset = unquote(path.lstrip("/")) or "index.html"
    return asset in STATIC_FILES


class JolizaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/health":
            send_json(self, 200, {"status": "ok"})
            return

        if not is_static_asset(path):
            send_json(self, 404, {"error": "Not found."})
            return

        super().do_GET()

    def do_HEAD(self):
        path = urlsplit(self.path).path
        if path == "/api/health":
            send_json(self, 200, {"status": "ok"}, head_only=True)
            return

        if not is_static_asset(path):
            send_json(self, 404, {"error": "Not found."}, head_only=True)
            return

        super().do_HEAD()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/inquiries":
            send_json(self, 404, {"error": "Not found."})
            return
        if self.headers.get_content_type() != "application/json":
            send_json(self, 415, {"error": "Send the form as JSON."})
            return

        content_length = self.headers.get("Content-Length")
        try:
            body_length = int(content_length)
        except (TypeError, ValueError):
            send_json(self, 400, {"error": "Invalid request body."})
            return
        if body_length < 1 or body_length > MAX_BODY_BYTES:
            send_json(self, 413, {"error": "The message is too large."})
            return

        try:
            payload = json.loads(self.rfile.read(body_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            send_json(self, 400, {"error": "Invalid JSON."})
            return
        if not isinstance(payload, dict):
            send_json(self, 400, {"error": "Invalid form data."})
            return

        website = payload.get("website", "")
        if not isinstance(website, str):
            send_json(self, 400, {"error": "Invalid form data."})
            return

        # Silently accept bot submissions without saving them.
        if website.strip():
            send_json(self, 201, {"message": "Thanks for getting in touch. We'll be in contact soon."})
            return

        now = time.monotonic()
        client_key = self.client_address[0]
        submissions = recent_submissions[client_key]
        while submissions and now - submissions[0] >= RATE_LIMIT_WINDOW_SECONDS:
            submissions.popleft()
        if len(submissions) >= RATE_LIMIT_COUNT:
            send_json(self, 429, {"error": "Too many messages. Please try again later."})
            return

        inquiry_type = payload.get("inquiry_type")
        name = payload.get("name")
        email = payload.get("email")
        message = payload.get("message")
        if not all(isinstance(value, str) for value in (inquiry_type, name, email, message)):
            send_json(self, 400, {"error": "Invalid form data."})
            return

        inquiry_type = inquiry_type.strip()
        name = name.strip()
        email = email.strip()
        message = message.strip()

        if inquiry_type not in ALLOWED_INQUIRY_TYPES:
            send_json(self, 400, {"error": "Choose a valid reason for getting in touch."})
            return
        if not name or len(name) > 100:
            send_json(self, 400, {"error": "Enter your name (up to 100 characters)."})
            return
        if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
            send_json(self, 400, {"error": "Enter a valid email address."})
            return
        if not message or len(message) > 5000:
            send_json(self, 400, {"error": "Enter a message (up to 5,000 characters)."})
            return

        try:
            with connect_database() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO inquiries (inquiry_type, name, email, message)
                    VALUES (?, ?, ?, ?)
                    """,
                    (inquiry_type, name, email, message),
                )
                inquiry_id = cursor.lastrowid
        except sqlite3.Error:
            self.log_error("Failed to save an inquiry")
            send_json(self, 500, {"error": "We couldn't save your message. Please try again later."})
            return
        except OSError:
            self.log_error("Failed to secure the inquiry database")
            send_json(self, 500, {"error": "We couldn't save your message. Please try again later."})
            return

        submissions.append(now)
        email_settings = getattr(self.server, "email_settings", None)
        try:
            notification_sent = send_inquiry_notification(
                email_settings, inquiry_id, inquiry_type, name, email, message
            )
        except smtplib.SMTPAuthenticationError as error:
            self.log_error(
                "SMTP authentication rejected (code %s); verify the SMTP username and "
                "provider app password",
                error.smtp_code,
            )
            notification_sent = False
        except (OSError, smtplib.SMTPException, ssl.SSLError) as error:
            self.log_error("Failed to send inquiry notification: %r", error)
            notification_sent = False

        response_message = (
            "Thanks for getting in touch. We'll be in contact soon."
            if notification_sent
            else "Your inquiry was saved, but email notifications are unavailable right now."
        )
        send_json(
            self,
            201,
            {
                "id": inquiry_id,
                "message": response_message,
                "notification_sent": notification_sent,
            },
        )

    def log_message(self, format, *args):
        # Keep form contents and email addresses out of request logs.
        super().log_message(format, *args)


def list_inquiries():
    if not DB_PATH.exists():
        print("No inquiries have been received yet.")
        return
    with sqlite3.connect(DB_PATH) as connection:
        rows = connection.execute(
            """
            SELECT id, created_at, inquiry_type, name, email, message
            FROM inquiries
            ORDER BY id DESC
            """
        ).fetchall()
    if not rows:
        print("No inquiries have been received yet.")
        return
    for inquiry_id, created_at, inquiry_type, name, email, message in rows:
        print(f"#{inquiry_id} | {created_at} | {inquiry_type} | {name} <{email}>")
        print(message)
        print()


def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "list-inquiries" and len(sys.argv) == 2:
            list_inquiries()
            return
        print(f"Usage: {Path(sys.argv[0]).name} [list-inquiries]", file=sys.stderr)
        raise SystemExit(2)

    connect_database().close()
    try:
        email_settings = load_email_settings()
    except ValueError as error:
        print(f"Email configuration error: {error}", file=sys.stderr)
        raise SystemExit(2) from error

    host = os.environ.get("HOST", "127.0.0.1")
    try:
        port = int(os.environ.get("PORT", "8000"))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print("PORT must be a number between 1 and 65535.", file=sys.stderr)
        raise SystemExit(2) from None
    server = ThreadingHTTPServer((host, port), JolizaHandler)
    server.email_settings = email_settings
    print(f"Joliza backend serving on http://{host}:{port}")
    if email_settings:
        print(f"Email notifications enabled for {email_settings.recipient}")
    else:
        print("Email notifications are not configured; inquiries will still be saved.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
