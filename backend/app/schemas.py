from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

class InspectionCreate(BaseModel):
    part_name: str
    batch_id: Optional[str] = None
    expected_qty: int
    detected_qty: int
    average_confidence: float
    image_path: Optional[str] = None
    image_result_path: Optional[str] = None
    processing_time_sec: Optional[float] = None


class InspectionResponse(BaseModel):
    id: int
    inspection_id: str
    part_name: str
    batch_id: Optional[str]
    expected_qty: int
    detected_qty: int
    discrepancy: int
    is_match: bool
    average_confidence: float
    image_path: Optional[str]
    image_result_path: Optional[str]
    processing_time_sec: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardStats(BaseModel):
    total_inspections: int
    accuracy: float
    mae: float
    discrepancies: int

class ActiveSettingsUpdate(BaseModel):
    part_name: str
    expected_qty: int
