import logging
import os
import re
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage


logger = logging.getLogger(__name__)
SMTP_TIMEOUT_SECONDS = 10
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class EmailSettings:
    host: str
    port: int
    sender: str
    recipient: str
    username: str
    password: str


def get_email_settings() -> EmailSettings | None:
    host = os.environ.get("JOLIZA_SMTP_HOST", "").strip()
    sender = os.environ.get("JOLIZA_EMAIL_FROM", "").strip()
    recipient = os.environ.get("JOLIZA_NOTIFY_EMAIL", "").strip()
    username = os.environ.get("JOLIZA_SMTP_USERNAME", "")
    password = os.environ.get("JOLIZA_SMTP_PASSWORD", "")

    if not any((host, sender, recipient, username, password)):
        return None
    if (
        not host
        or any(character.isspace() for character in host)
        or not EMAIL_PATTERN.fullmatch(sender)
        or not EMAIL_PATTERN.fullmatch(recipient)
        or bool(username) != bool(password)
    ):
        raise ValueError("SMTP notification configuration is invalid.")

    try:
        port = int(os.environ.get("JOLIZA_SMTP_PORT", "587"))
    except ValueError as error:
        raise ValueError("SMTP notification configuration is invalid.") from error
    if not 1 <= port <= 65535:
        raise ValueError("SMTP notification configuration is invalid.")

    return EmailSettings(host, port, sender, recipient, username, password)


def send_inquiry_notification(
    inquiry_id: int,
    inquiry_type: str,
    name: str,
    email: str,
    message: str,
) -> bool:
    settings = get_email_settings()
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
            settings.host,
            settings.port,
            timeout=SMTP_TIMEOUT_SECONDS,
            context=context,
        ) as smtp:
            if settings.username:
                smtp.login(settings.username, settings.password)
            smtp.send_message(notification)
    else:
        with smtplib.SMTP(
            settings.host, settings.port, timeout=SMTP_TIMEOUT_SECONDS
        ) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            if settings.username:
                smtp.login(settings.username, settings.password)
            smtp.send_message(notification)
    return True


def log_notification_failure(error: Exception) -> None:
    logger.warning("Failed to send inquiry notification (%s)", type(error).__name__)
