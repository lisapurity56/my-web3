import os
import sys
from pathlib import Path
import unittest

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from backend.app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


class FullBackendApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_register_and_login(self):
        response = self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Alice Example", "email": "alice@example.com", "password": "secretpass"},
        )
        self.assertEqual(response.status_code, 201)
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "alice@example.com", "password": "secretpass"},
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("token", login.json())

    def test_product_and_order_workflow(self):
        create_product = self.client.post(
            "/api/v1/products",
            json={
                "name": "Plain Yogourt",
                "description": "Creamy plain yogourt made in small batches.",
                "price": 18.5,
                "category": "dairy",
            },
        )
        self.assertEqual(create_product.status_code, 201)
        product_id = create_product.json()["id"]

        register = self.client.post(
            "/api/v1/auth/register",
            json={"full_name": "Shopper One", "email": "shopper@example.com", "password": "secretpass"},
        )
        user_id = register.json()["user"]["id"]

        order_response = self.client.post(
            "/api/v1/orders",
            json={"user_id": user_id, "items": [{"product_id": product_id, "quantity": 2}]},
        )
        self.assertEqual(order_response.status_code, 201)
        payload = order_response.json()
        self.assertEqual(payload["total_amount"], 37.0)
        self.assertEqual(len(payload["items"]), 1)

    def test_inquiry_submission_compatibility(self):
        response = self.client.post(
            "/api/inquiries",
            json={
                "inquiry_type": "order",
                "name": "Test Buyer",
                "email": "buyer@example.com",
                "message": "I would like to place an order for plain yogourt.",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["notification_sent"], False)

    def test_honeypot_inquiry_is_ignored(self):
        response = self.client.post(
            "/api/inquiries",
            json={
                "inquiry_type": "general",
                "name": "Bot User",
                "email": "bot@example.com",
                "message": "This is a bot message.",
                "website": "https://example.com",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("Thanks for getting in touch", response.json()["message"])


if __name__ == "__main__":
    unittest.main()
