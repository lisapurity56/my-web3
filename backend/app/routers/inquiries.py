from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Inquiry
from backend.app.schemas import InquiryCreate

router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_inquiry(payload: InquiryCreate, db: Session = Depends(get_db)):
    if payload.website:
        return {"message": "Thanks for getting in touch. We'll be in contact soon."}

    inquiry = Inquiry(
        inquiry_type=payload.inquiry_type,
        name=payload.name,
        email=payload.email,
        message=payload.message,
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return {
        "id": inquiry.id,
        "message": "Your inquiry was saved, but email notifications are unavailable right now.",
        "notification_sent": False,
    }
