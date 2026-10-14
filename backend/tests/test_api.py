import unittest

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
        response = self.client.post("/api/inquiries", json=self.inquiry_payload())

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["notification_sent"], False)
        with TestSession() as db:
            inquiry = db.query(Inquiry).one()
            self.assertEqual(inquiry.name, "Test Buyer")
            self.assertEqual(inquiry.email, "buyer@example.com")

    def test_invalid_inquiries_return_clear_errors(self):
        invalid_payloads = (
            {"inquiry_type": "wholesale"},
            {"name": "   "},
            {"email": "not-an-email"},
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
