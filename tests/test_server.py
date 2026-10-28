import json
import os
import smtplib
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

import server


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "inquiries.sqlite3"
        self.db_path_patch = patch.object(server, "DB_PATH", self.db_path)
        self.db_path_patch.start()
        server.recent_submissions.clear()
        server.recent_review_submissions.clear()
        server.connect_database().close()

        self.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.JolizaHandler)
        self.httpd.email_settings = None
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.httpd.server_port}"

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)
        self.db_path_patch.stop()
        self.temp_dir.cleanup()

    def request(self, path, method="GET", body=None, headers=None):
        request = urllib.request.Request(
            self.base_url + path, data=body, headers=headers or {}, method=method
        )
        try:
            response = urllib.request.urlopen(request, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw_body = response.read()
            payload = json.loads(raw_body) if raw_body else None
            return response.status, payload

    def submit_inquiry(self, **overrides):
        payload = {
            "inquiry_type": "general",
            "name": "Test Person",
            "email": "person@example.com",
            "message": "Hello Joliza",
        }
        payload.update(overrides)
        return self.request(
            "/api/inquiries",
            method="POST",
            body=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )

    def submit_review(self, **overrides):
        payload = {
            "name": "Test Reviewer",
            "rating": 5,
            "comment": "Creamy and delicious.",
        }
        payload.update(overrides)
        return self.request(
            "/api/reviews",
            method="POST",
            body=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )

    def test_reviews_endpoint_returns_approved_reviews(self):
        status, payload = self.request("/api/reviews")
        self.assertEqual(status, 200)
        self.assertEqual(payload, [])

        with server.connect_database() as connection:
            connection.execute(
                "INSERT INTO reviews (name, rating, comment, approved) VALUES (?, ?, ?, 1)",
                ("Test Reviewer", 5, "Creamy and delicious."),
            )

        status, payload = self.request("/api/reviews")
        self.assertEqual(status, 200)
        self.assertEqual(
            payload,
            [{"name": "Test Reviewer", "rating": 5, "comment": "Creamy and delicious."}],
        )

    def test_review_submission_is_saved_for_moderation(self):
        status, payload = self.submit_review()
        self.assertEqual(status, 201)
        self.assertIn("moderation", payload["message"])

        with server.connect_database() as connection:
            review = connection.execute(
                "SELECT name, rating, comment, approved FROM reviews"
            ).fetchone()
        self.assertEqual(review, ("Test Reviewer", 5, "Creamy and delicious.", 0))

        status, public_reviews = self.request("/api/reviews")
        self.assertEqual(status, 200)
        self.assertEqual(public_reviews, [])

    def test_invalid_review_is_rejected(self):
        status, payload = self.submit_review(rating=6)
        self.assertEqual(status, 400)
        self.assertIn("rating", payload["error"])

    def test_valid_inquiry_is_saved_even_if_email_is_not_configured(self):
        with patch.object(server, "send_inquiry_notification", return_value=False):
            status, payload = self.submit_inquiry()

        self.assertEqual(status, 201)
        self.assertFalse(payload["notification_sent"])
        self.assertIn("saved", payload["message"])
        with server.connect_database() as connection:
            row = connection.execute("SELECT name, email, message FROM inquiries").fetchone()
        self.assertEqual(row, ("Test Person", "person@example.com", "Hello Joliza"))

    def test_mail_failure_does_not_lose_saved_inquiry(self):
        with patch.object(
            server, "send_inquiry_notification", side_effect=smtplib.SMTPException("failed")
        ):
            status, payload = self.submit_inquiry()

        self.assertEqual(status, 201)
        self.assertFalse(payload["notification_sent"])
        with server.connect_database() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0], 1)

    def test_smtp_authentication_failure_logs_remediation_and_preserves_inquiry(self):
        authentication_error = smtplib.SMTPAuthenticationError(535, b"authentication rejected")
        with (
            patch.object(server, "send_inquiry_notification", side_effect=authentication_error),
            patch.object(server.JolizaHandler, "log_error") as log_error,
        ):
            status, payload = self.submit_inquiry()

        self.assertEqual(status, 201)
        self.assertFalse(payload["notification_sent"])
        log_error.assert_called_once_with(
            "SMTP authentication rejected (code %s); verify the SMTP username and "
            "provider app password",
            535,
        )
        with server.connect_database() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0], 1)

    def test_email_success_is_reported_to_the_form(self):
        self.httpd.email_settings = object()
        with patch.object(server, "send_inquiry_notification", return_value=True):
            status, payload = self.submit_inquiry()

        self.assertEqual(status, 201)
        self.assertTrue(payload["notification_sent"])
        self.assertIn("contact soon", payload["message"])

    def test_honeypot_submission_is_not_stored_or_emailed(self):
        with patch.object(server, "send_inquiry_notification") as send_email:
            status, _ = self.submit_inquiry(website="bot-filled")

        self.assertEqual(status, 201)
        send_email.assert_not_called()
        with server.connect_database() as connection:
            self.assertEqual(connection.execute("SELECT COUNT(*) FROM inquiries").fetchone()[0], 0)

    def test_malformed_field_types_are_rejected(self):
        status, payload = self.submit_inquiry(name={"unexpected": "object"})
        self.assertEqual(status, 400)
        self.assertIn("Invalid form data", payload["error"])

    def test_private_files_are_not_served_by_get_or_head(self):
        for method in ("GET", "HEAD"):
            with self.subTest(method=method):
                status, _ = self.request("/server.py", method=method)
                self.assertEqual(status, 404)

    def test_email_notification_uses_starttls_and_reply_to(self):
        settings = server.EmailSettings(
            host="smtp.example.com",
            port=587,
            sender="website@example.com",
            recipient="owner@example.com",
            username="smtp-user",
            password="smtp-password",
        )
        with patch.object(server.smtplib, "SMTP") as smtp_class:
            smtp = smtp_class.return_value.__enter__.return_value
            result = server.send_inquiry_notification(
                settings, 12, "order", "Test Person", "person@example.com", "One pot, please."
            )

        self.assertTrue(result)
        smtp.starttls.assert_called_once()
        smtp.login.assert_called_once_with("smtp-user", "smtp-password")
        notification = smtp.send_message.call_args.args[0]
        self.assertEqual(notification["To"], "owner@example.com")
        self.assertEqual(notification["Reply-To"], "person@example.com")
        self.assertIn("One pot, please.", notification.get_content())


class EmailConfigurationTests(unittest.TestCase):
    def test_partial_smtp_configuration_is_rejected(self):
        with patch.dict(os.environ, {"JOLIZA_SMTP_HOST": "smtp.example.com"}, clear=True):
            with self.assertRaisesRegex(ValueError, "JOLIZA_EMAIL_FROM"):
                server.load_email_settings()

    def test_empty_smtp_configuration_disables_notifications(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(server.load_email_settings())

    def test_smtp_host_with_whitespace_is_rejected(self):
        settings = {
            "JOLIZA_SMTP_HOST": "smtp example.com",
            "JOLIZA_EMAIL_FROM": "sender@example.com",
        }
        with patch.dict(os.environ, settings, clear=True):
            with self.assertRaisesRegex(ValueError, "valid host name"):
                server.load_email_settings()


class EnvFileTests(unittest.TestCase):
    def test_load_env_file_loads_values_without_overriding_environment(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            env_file = Path(temp_dir) / ".env"
            env_file.write_text(
                "# SMTP settings\n"
                "export JOLIZA_SMTP_HOST=smtp.example.com\n"
                'JOLIZA_EMAIL_FROM="website@example.com" # inline comment\n'
                "JOLIZA_SMTP_PASSWORD=from-file # trailing comment\n"
                "EXISTING_SETTING=file-value\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"EXISTING_SETTING": "environment-value"}, clear=True):
                server.load_env_file(env_file)

                self.assertEqual(os.environ["JOLIZA_SMTP_HOST"], "smtp.example.com")
                self.assertEqual(os.environ["JOLIZA_EMAIL_FROM"], "website@example.com")
                self.assertEqual(os.environ["JOLIZA_SMTP_PASSWORD"], "from-file")
                self.assertEqual(os.environ["EXISTING_SETTING"], "environment-value")

    def test_load_env_file_ignores_missing_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            server.load_env_file(Path(temp_dir) / "missing.env")


if __name__ == "__main__":
    unittest.main()
