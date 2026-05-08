from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Gunakan string ID seperti "INS-1247" untuk kemudahan baca
    inspection_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    
    part_name: Mapped[str] = mapped_column(String(100), index=True)
    batch_id: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Hasil Deteksi
    expected_qty: Mapped[int] = mapped_column(Integer)
    detected_qty: Mapped[int] = mapped_column(Integer)
    discrepancy: Mapped[int] = mapped_column(Integer)  # detected - expected
    is_match: Mapped[bool] = mapped_column(Boolean)
    average_confidence: Mapped[float] = mapped_column(Float)
    
    # Metadata Gambar
    image_path: Mapped[str] = mapped_column(String(500), nullable=True)
    processing_time_sec: Mapped[float] = mapped_column(Float, nullable=True)
    
    # Waktu
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
