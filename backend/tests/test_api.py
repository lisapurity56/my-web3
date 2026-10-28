import unittest
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db  # noqa: E402
from backend.app.main import app  # noqa: E402
from backend.app.models import Inquiry  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=test_engine)


class InquiryApiTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)

        def get_test_db():
            db = TestSession()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = get_test_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()

    def inquiry_payload(self):
        return {
            "inquiry_type": "order",
            "name": "Test Buyer",
            "email": "buyer@example.com",
            "message": "I would like to place an order.",
        }

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_valid_inquiry_is_saved(self):
        with patch.dict(
            "os.environ",
            {
                "JOLIZA_SMTP_HOST": "",
                "JOLIZA_SMTP_PORT": "",
                "JOLIZA_SMTP_USERNAME": "",
                "JOLIZA_SMTP_PASSWORD": "",
                "JOLIZA_EMAIL_FROM": "",
                "JOLIZA_NOTIFY_EMAIL": "",
            },
        ):
            response = self.client.post(
                "/api/inquiries", json=self.inquiry_payload()
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["notification_sent"], False)
        with TestSession() as db:
            inquiry = db.query(Inquiry).one()
            self.assertEqual(inquiry.name, "Test Buyer")
            self.assertEqual(inquiry.email, "buyer@example.com")

    def test_preorder_and_event_requests_can_be_saved_without_email(self):
        for inquiry_type in ("preorder", "event"):
            with self.subTest(inquiry_type=inquiry_type):
                payload = {
                    **self.inquiry_payload(),
                    "inquiry_type": inquiry_type,
                    "email": "",
                }
                with patch.dict(
                    "os.environ",
                    {
                        "JOLIZA_SMTP_HOST": "",
                        "JOLIZA_SMTP_PORT": "",
                        "JOLIZA_SMTP_USERNAME": "",
                        "JOLIZA_SMTP_PASSWORD": "",
                        "JOLIZA_EMAIL_FROM": "",
                        "JOLIZA_NOTIFY_EMAIL": "",
                    },
                ):
                    response = self.client.post("/api/inquiries", json=payload)

                self.assertEqual(response.status_code, 201)
                with TestSession() as db:
                    inquiry = db.query(Inquiry).one()
                    self.assertEqual(inquiry.inquiry_type, inquiry_type)
                    self.assertEqual(inquiry.email, "")
                    db.delete(inquiry)
                    db.commit()

    def test_notification_succeeds_without_reply_to_email(self):
        smtp = MagicMock()
        smtp.__enter__.return_value = smtp
        env = {
            "JOLIZA_SMTP_HOST": "smtp.example.com",
            "JOLIZA_SMTP_PORT": "587",
            "JOLIZA_SMTP_USERNAME": "",
            "JOLIZA_SMTP_PASSWORD": "",
            "JOLIZA_EMAIL_FROM": "from@example.com",
            "JOLIZA_NOTIFY_EMAIL": "notify@example.com",
        }
        payload = {
            **self.inquiry_payload(),
            "inquiry_type": "event",
            "email": "",
        }
        with (
            patch.dict("os.environ", env),
            patch(
                "backend.app.email_notifications.smtplib.SMTP", return_value=smtp
            ),
        ):
            response = self.client.post("/api/inquiries", json=payload)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["notification_sent"])
        notification = smtp.send_message.call_args.args[0]
        self.assertIsNone(notification.get("Reply-To"))

    def test_inquiry_notification_uses_starttls(self):
        smtp = MagicMock()
        smtp.__enter__.return_value = smtp
        env = {
            "JOLIZA_SMTP_HOST": "smtp.example.com",
            "JOLIZA_SMTP_PORT": "587",
            "JOLIZA_SMTP_USERNAME": "smtp-user",
            "JOLIZA_SMTP_PASSWORD": "smtp-password",
            "JOLIZA_EMAIL_FROM": "from@example.com",
            "JOLIZA_NOTIFY_EMAIL": "notify@example.com",
        }
        with (
            patch.dict("os.environ", env),
            patch(
                "backend.app.email_notifications.smtplib.SMTP", return_value=smtp
            ) as smtp_class,
        ):
            response = self.client.post(
                "/api/inquiries", json=self.inquiry_payload()
            )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["notification_sent"])
        smtp_class.assert_called_once_with(
            "smtp.example.com", 587, timeout=10
        )
        smtp.ehlo.assert_any_call()
        smtp.starttls.assert_called_once()
        smtp.login.assert_called_once_with("smtp-user", "smtp-password")
        smtp.send_message.assert_called_once()

    def test_inquiry_notification_uses_implicit_tls(self):
        smtp = MagicMock()
        smtp.__enter__.return_value = smtp
        env = {
            "JOLIZA_SMTP_HOST": "smtp.example.com",
            "JOLIZA_SMTP_PORT": "465",
            "JOLIZA_SMTP_USERNAME": "",
            "JOLIZA_SMTP_PASSWORD": "",
            "JOLIZA_EMAIL_FROM": "from@example.com",
            "JOLIZA_NOTIFY_EMAIL": "notify@example.com",
        }
        with (
            patch.dict("os.environ", env),
            patch(
                "backend.app.email_notifications.smtplib.SMTP_SSL",
                return_value=smtp,
            ) as smtp_class,
        ):
            response = self.client.post(
                "/api/inquiries", json=self.inquiry_payload()
            )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["notification_sent"])
        smtp_class.assert_called_once()
        self.assertEqual(smtp_class.call_args.args, ("smtp.example.com", 465))
        smtp.send_message.assert_called_once()
        smtp.starttls.assert_not_called()

    def test_notification_failure_does_not_discard_inquiry_or_log_pii(self):
        env = {
            "JOLIZA_SMTP_HOST": "smtp.example.com",
            "JOLIZA_SMTP_PORT": "587",
            "JOLIZA_SMTP_USERNAME": "",
            "JOLIZA_SMTP_PASSWORD": "",
            "JOLIZA_EMAIL_FROM": "from@example.com",
            "JOLIZA_NOTIFY_EMAIL": "notify@example.com",
        }
        with (
            patch.dict("os.environ", env),
            patch(
                "backend.app.email_notifications.smtplib.SMTP",
                side_effect=OSError("connection failed"),
            ),
            self.assertLogs("backend.app.email_notifications", level="WARNING") as logs,
        ):
            response = self.client.post(
                "/api/inquiries", json=self.inquiry_payload()
            )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json()["notification_sent"])
        self.assertIn("Failed to send inquiry notification", logs.output[0])
        self.assertNotIn("buyer@example.com", logs.output[0])
        self.assertNotIn("place an order", logs.output[0])
        with TestSession() as db:
            self.assertEqual(db.query(Inquiry).count(), 1)

    def test_invalid_inquiries_return_clear_errors(self):
        invalid_payloads = (
            {"inquiry_type": "wholesale"},
            {"name": "   "},
            {"email": "not-an-email"},
            {"email": "", "inquiry_type": "general"},
            {"message": ""},
        )
        for invalid_fields in invalid_payloads:
            with self.subTest(invalid_fields=invalid_fields):
                response = self.client.post(
                    "/api/inquiries",
                    json={**self.inquiry_payload(), **invalid_fields},
                )
                self.assertEqual(response.status_code, 422)
                self.assertIn("error", response.json())

    def test_honeypot_request_is_accepted_but_not_saved(self):
        response = self.client.post(
            "/api/inquiries",
            json={**self.inquiry_payload(), "website": "https://bot.example"},
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("Thanks for getting in touch", response.json()["message"])
        with TestSession() as db:
            self.assertEqual(db.query(Inquiry).count(), 0)


if __name__ == "__main__":
    unittest.main()
