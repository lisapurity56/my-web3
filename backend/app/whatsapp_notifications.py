import json
import os
import re
from dataclasses import dataclass
from typing import Optional
from urllib.request import Request, urlopen


WHATSAPP_TIMEOUT_SECONDS = 10
WHATSAPP_TEXT_LIMIT = 1024


@dataclass(frozen=True)
class WhatsAppSettings:
    access_token: str
    phone_number_id: str
    recipient: str
    template_name: str
    template_language: str
    api_version: str


def get_whatsapp_settings() -> Optional[WhatsAppSettings]:
    access_token = os.environ.get("JOLIZA_WHATSAPP_ACCESS_TOKEN", "").strip()
    phone_number_id = os.environ.get("JOLIZA_WHATSAPP_PHONE_NUMBER_ID", "").strip()
    recipient = os.environ.get("JOLIZA_WHATSAPP_TO", "").strip()
    template_name = os.environ.get("JOLIZA_WHATSAPP_TEMPLATE_NAME", "").strip()
    template_language = os.environ.get(
        "JOLIZA_WHATSAPP_TEMPLATE_LANGUAGE", "en_US"
    ).strip()
    api_version = os.environ.get("JOLIZA_WHATSAPP_API_VERSION", "v23.0").strip()

    values = (access_token, phone_number_id, recipient, template_name)
    if not any(values):
        return None
    if (
        not all(values)
        or not re.fullmatch(r"\d+", phone_number_id)
        or not re.fullmatch(r"\+?[1-9]\d{6,14}", recipient)
        or not re.fullmatch(r"[a-z0-9_]+", template_name)
        or not re.fullmatch(r"[a-z]{2}_[A-Z]{2}", template_language)
        or not re.fullmatch(r"v\d+\.\d+", api_version)
    ):
        raise ValueError("WhatsApp notification configuration is invalid.")

    return WhatsAppSettings(
        access_token,
        phone_number_id,
        recipient.lstrip("+"),
        template_name,
        template_language,
        api_version,
    )


def send_whatsapp_notification(
    inquiry_id: int,
    inquiry_type: str,
    name: str,
    email: str,
    message: str,
) -> bool:
    settings = get_whatsapp_settings()
    if settings is None:
        return False

    text = (
        f"Inquiry #{inquiry_id}\n"
        f"Type: {inquiry_type}\n"
        f"Name: {name}\n"
        f"Email: {email or 'Not provided'}\n\n"
        f"{message}"
    )
    if len(text) > WHATSAPP_TEXT_LIMIT:
        text = f"{text[:WHATSAPP_TEXT_LIMIT - 3]}..."

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": settings.recipient,
        "type": "template",
        "template": {
            "name": settings.template_name,
            "language": {"code": settings.template_language},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": text}],
                }
            ],
        },
    }
    request = Request(
        f"https://graph.facebook.com/{settings.api_version}/"
        f"{settings.phone_number_id}/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=WHATSAPP_TIMEOUT_SECONDS):
        return True
