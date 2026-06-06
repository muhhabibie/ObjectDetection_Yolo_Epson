from datetime import datetime
from sqlalchemy import UUID, Column, String, Integer, Float, DateTime, Boolean, Text
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
    image_path: Mapped[str] = mapped_column(String(500), nullable=True)         # gambar raw/asli
    image_result_path: Mapped[str] = mapped_column(String(500), nullable=True)  # gambar hasil deteksi
    processing_time_sec: Mapped[float] = mapped_column(Float, nullable=True)
    
    # Waktu
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)
    username = Column(String(50), unique=True)
    email = Column(String(255), unique=True)
    password_hash = Column(Text)
    role = Column(String(20), default="user")
    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    username = Column(String(50), nullable=True)
    role = Column(String(20), nullable=True)
    action = Column(String(50), index=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
