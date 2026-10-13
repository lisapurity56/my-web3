from datetime import datetime
from decimal import Decimal
import re
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(value: str) -> str:
    cleaned = value.strip().lower()
    if len(cleaned) > 255 or not EMAIL_PATTERN.fullmatch(cleaned):
        raise ValueError("Email must be valid.")
    return cleaned


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Name is required.")
        return cleaned

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return normalize_email(value)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return normalize_email(value)


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=10, max_length=5000)
    price: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    category: str = Field(..., min_length=2, max_length=120)

    @field_validator("name", "description", "category")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be blank.")
        return cleaned


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    price: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    category: Optional[str] = Field(None, min_length=2, max_length=120)
    is_active: Optional[bool] = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    price: Decimal
    category: str
    is_active: bool
    created_at: datetime


class OrderItemInput(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., ge=1, le=100)


class OrderCreate(BaseModel):
    items: List[OrderItemInput] = Field(..., min_length=1, max_length=50)


class OrderStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"pending", "confirmed", "preparing", "ready", "completed", "cancelled"}:
            raise ValueError("Invalid order status.")
        return cleaned


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: Decimal


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str
    total_amount: Decimal
    created_at: datetime
    items: List[OrderItemRead]


class InquiryCreate(BaseModel):
    inquiry_type: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=255)
    message: str = Field(..., min_length=10, max_length=5000)
    website: Optional[str] = Field("", max_length=255)

    @field_validator("inquiry_type")
    @classmethod
    def validate_inquiry_type(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"general", "order", "stockist"}:
            raise ValueError("Inquiry type must be general, order, or stockist.")
        return cleaned

    @field_validator("name", "message")
    @classmethod
    def clean_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be blank.")
        return cleaned

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return normalize_email(value)


class InquiryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inquiry_type: str
    name: str
    email: str
    message: str
    website: Optional[str] = None
    created_at: datetime
