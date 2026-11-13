import re

from pydantic import BaseModel, Field, field_validator, model_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ALLOWED_FLAVOURS = {"Vanilla", "Strawberry", "Banana", "Mango", "Coco", "Mixfruit"}
MAX_FLAVOUR_QUANTITY = 50


def normalize_email(value: str) -> str:
    cleaned = value.strip().lower()
    if len(cleaned) > 254 or not EMAIL_PATTERN.fullmatch(cleaned):
        raise ValueError("Email must be valid.")
    return cleaned


class FlavourQuantity(BaseModel):
    flavour: str
    quantity: int = Field(strict=True, ge=1, le=MAX_FLAVOUR_QUANTITY)

    @field_validator("flavour")
    @classmethod
    def validate_flavour(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned not in ALLOWED_FLAVOURS:
            raise ValueError("Choose only flavours from the available list.")
        return cleaned


class InquiryCreate(BaseModel):
    inquiry_type: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(default="", max_length=254)
    message: str = Field(..., min_length=1, max_length=5000)
    website: str = ""
    flavours: list[FlavourQuantity] = Field(default_factory=list)

    @field_validator("inquiry_type")
    @classmethod
    def validate_inquiry_type(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"general", "order", "preorder", "event", "stockist"}:
            raise ValueError(
                "Inquiry type must be general, order, preorder, event, or stockist."
            )
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
        return normalize_email(value) if value.strip() else ""

    @field_validator("website")
    @classmethod
    def clean_website(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def require_email_for_contact_inquiries(self):
        selected_flavours = [item.flavour for item in self.flavours]
        if len(set(selected_flavours)) != len(selected_flavours):
            raise ValueError("Each flavour can appear only once.")
        if self.inquiry_type in {"general", "stockist"} and not self.email:
            raise ValueError("Email is required for general and stockist inquiries.")
        if self.inquiry_type == "event" and not self.flavours:
            raise ValueError("Choose at least one flavour for an event inquiry.")
        return self
