from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import os
from datetime import timedelta
from fastapi import HTTPException, status
from twilio.rest import Client

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
SOS_COOLDOWN_MINUTES = 30


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    CANCELLED = "cancelled"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class TriggerType(str, Enum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"


class SOSAlertBase(BaseModel):
    trigger_type: TriggerType
    severity: AlertSeverity
    reason: Optional[str] = Field(default=None, max_length=500)
    emotion_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SOSAlertCreate(SOSAlertBase):
    pass


class SOSAlert(SOSAlertBase):
    id: str
    user_id: str
    status: AlertStatus
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SOSAlertList(BaseModel):
    alerts: List[SOSAlert]
    total: int
    page: int
    size: int


class SOSAlertResponse(BaseModel):
    alert_id: str
    status: AlertStatus
    message: str


async def send_sos_sms(user: Any):
    """Send emergency SOS SMS via Twilio to primary emergency contact."""
    # 1. Validation Check: Ensure emergency contacts exist
    contacts = getattr(user, "emergency_contacts", None)
    if isinstance(user, dict):
        contacts = user.get("emergency_contacts")

    if not contacts or len(contacts) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No emergency contacts configured in your account profile."
        )

    # 2. 30-Minute Cooldown Mechanism
    current_time = datetime.utcnow()
    last_sos = getattr(user, "last_sos_sent", None)
    if isinstance(user, dict):
        last_sos = user.get("last_sos_sent")

    if last_sos:
        cooldown_expiry = last_sos + timedelta(minutes=SOS_COOLDOWN_MINUTES)
        if current_time < cooldown_expiry:
            remaining_time = int((cooldown_expiry - current_time).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"SOS limit active. Please wait {remaining_time} minutes before retrying."
            )

    # 3. Target Data Extraction from primary contact
    primary_contact = contacts[0]
    if isinstance(primary_contact, dict):
        target_phone = primary_contact.get("phone")
    else:
        target_phone = getattr(primary_contact, "phone", None)

    if not target_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primary emergency contact does not have a valid phone number."
        )

    # 4. Integrate Twilio SMS Delivery
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        user_name = getattr(user, "name", None) or (user.get("name") if isinstance(user, dict) else "User")
        message_body = (
            f"EMERGENCY ALERT: Your contact {user_name} has triggered a CRITICAL "
            f"SOS manual alert via MindMitra. Please check on them immediately."
        )
        
        client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=target_phone
        )
    except Exception as e:
        print(f"Twilio Dispatch Failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to route emergency SMS through network carriers."
        )

    # 5. Save the state changes to user
    if isinstance(user, dict):
        user["last_sos_sent"] = current_time
    else:
        user.last_sos_sent = current_time

    if hasattr(user, "save") and callable(getattr(user, "save")):
        await user.save() 
        
    return "sent", "Emergency SOS broadcast successfully transmitted to contact."

