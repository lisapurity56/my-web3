import json
import os
import unittest
from unittest.mock import MagicMock, patch

from backend.app.whatsapp_notifications import (
    get_whatsapp_settings,
    send_whatsapp_notification,
)


WHATSAPP_ENV = {
    "JOLIZA_WHATSAPP_ACCESS_TOKEN": "test-token",
    "JOLIZA_WHATSAPP_PHONE_NUMBER_ID": "123456789",
    "JOLIZA_WHATSAPP_TO": "+15551234567",
    "JOLIZA_WHATSAPP_TEMPLATE_NAME": "inquiry_notification",
    "JOLIZA_WHATSAPP_TEMPLATE_LANGUAGE": "en_US",
    "JOLIZA_WHATSAPP_API_VERSION": "v23.0",
}


class WhatsAppNotificationTests(unittest.TestCase):
    def test_notifications_are_disabled_without_configuration(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(get_whatsapp_settings())
            self.assertFalse(
                send_whatsapp_notification(
                    1, "order", "Test Buyer", "buyer@example.com", "Please call me."
                )
            )

    def test_partial_configuration_is_rejected(self):
        with patch.dict(
            os.environ,
            {"JOLIZA_WHATSAPP_ACCESS_TOKEN": "test-token"},
            clear=True,
        ):
            with self.assertRaisesRegex(ValueError, "configuration is invalid"):
                get_whatsapp_settings()

    def test_sends_approved_template_with_inquiry_details(self):
        response = MagicMock()
        response.__enter__.return_value = response
        with (
            patch.dict(os.environ, WHATSAPP_ENV, clear=True),
            patch(
                "backend.app.whatsapp_notifications.urlopen",
                return_value=response,
            ) as urlopen,
        ):
            sent = send_whatsapp_notification(
                7, "order", "Test Buyer", "buyer@example.com", "Please call me."
            )

        self.assertTrue(sent)
        request = urlopen.call_args.args[0]
        self.assertEqual(
            request.full_url,
            "https://graph.facebook.com/v23.0/123456789/messages",
        )
        self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
        payload = json.loads(request.data)
        self.assertEqual(payload["to"], "15551234567")
        self.assertEqual(payload["template"]["name"], "inquiry_notification")
        self.assertIn(
            "Inquiry #7",
            payload["template"]["components"][0]["parameters"][0]["text"],
        )
        urlopen.assert_called_once_with(request, timeout=10)

    def test_template_parameter_is_limited_to_whatsapp_length(self):
        response = MagicMock()
        response.__enter__.return_value = response
        with (
            patch.dict(os.environ, WHATSAPP_ENV, clear=True),
            patch(
                "backend.app.whatsapp_notifications.urlopen",
                return_value=response,
            ) as urlopen,
        ):
            send_whatsapp_notification(
                7, "order", "Test Buyer", "buyer@example.com", "x" * 2000
            )

        request = urlopen.call_args.args[0]
        text = json.loads(request.data)["template"]["components"][0]["parameters"][0]["text"]
        self.assertEqual(len(text), 1024)
        self.assertTrue(text.endswith("..."))


if __name__ == "__main__":
    unittest.main()
