from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.email_notifications import (
    log_notification_failure,
    send_inquiry_notification,
)
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

    try:
        notification_sent = send_inquiry_notification(
            inquiry.id,
            inquiry.inquiry_type,
            inquiry.name,
            inquiry.email,
            inquiry.message,
        )
    except Exception as error:
        log_notification_failure(error)
        notification_sent = False

    return {
        "id": inquiry.id,
        "message": (
            "Thanks for getting in touch. We'll be in contact soon."
            if notification_sent
            else "Your inquiry was saved, but email notifications are unavailable right now."
        ),
        "notification_sent": notification_sent,
    }
