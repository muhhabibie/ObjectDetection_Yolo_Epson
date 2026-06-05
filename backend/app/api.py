import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Inspection
from app.schemas import InspectionCreate, InspectionResponse, DashboardStats
from app.models import Inspection, User
from app.schemas import (
    InspectionCreate,
    InspectionResponse,
    DashboardStats,
    LoginRequest
)

from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(prefix="/api", tags=["inspections"])

@router.post("/login")
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(
            User.email == credentials.email
        )
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    if not verify_password(
        credentials.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/inspections/", response_model=InspectionResponse)
async def create_inspection(
    inspection: InspectionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint untuk menyimpan hasil deteksi AI ke database.
    (Dipanggil otomatis oleh script Python processing setelah YOLO mendeteksi gambar)
    """
    # Generate ID unik, misal: INS-10293
    import random
    insp_id = f"INS-{random.randint(10000, 99999)}"
    
    db_insp = Inspection(
        inspection_id=insp_id,
        part_name=inspection.part_name,
        batch_id=inspection.batch_id,
        expected_qty=inspection.expected_qty,
        detected_qty=inspection.detected_qty,
        discrepancy=inspection.detected_qty - inspection.expected_qty,
        is_match=inspection.detected_qty == inspection.expected_qty,
        average_confidence=inspection.average_confidence,
        image_path=inspection.image_path,
        processing_time_sec=inspection.processing_time_sec
    )
    
    db.add(db_insp)
    await db.commit()
    await db.refresh(db_insp)
    return db_insp


@router.get("/inspections/", response_model=List[InspectionResponse])
async def get_all_inspections(
    skip: int = 0, 
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Endpoint untuk mengambil semua data riwayat inspeksi (untuk tabel Riwayat & Laporan)"""
    result = await db.execute(
        select(Inspection)
        .order_by(Inspection.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Menghitung KPI Dashboard (Akurasi, MAE, Total) dari DB PostgreSQL"""
    
    # Total Inspeksi
    total_result = await db.execute(select(func.count(Inspection.id)))
    total = total_result.scalar() or 0
    
    if total == 0:
        return DashboardStats(total_inspections=0, accuracy=0.0, mae=0.0, discrepancies=0)

    # Akurasi = (Jumlah Sesuai / Total) * 100
    match_result = await db.execute(
        select(func.count(Inspection.id)).where(Inspection.is_match == True)
    )
    matches = match_result.scalar() or 0
    accuracy = (matches / total) * 100

    # Discrepancies = Jumlah Tidak Sesuai
    discrepancies = total - matches

    # MAE (Mean Absolute Error) = Rata-rata dari absolute(discrepancy)
    mae_result = await db.execute(
        select(func.avg(func.abs(Inspection.discrepancy)))
    )
    mae = mae_result.scalar() or 0.0

    return DashboardStats(
        total_inspections=total,
        accuracy=round(accuracy, 1),
        mae=round(mae, 3),
        discrepancies=discrepancies
    )


@router.post("/upload-camera/")
async def upload_camera_image(
    file: UploadFile = File(...),
    part_name: str = Form(...),
    expected_qty: int = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint ini disiapkan untuk menerima kiriman gambar dari Kamera HP.
    Alur:
    1. Simpan gambar sementara
    2. Panggil module YOLOv8 + SAHI + CLAHE
    3. Simpan hasil ke DB
    """
    # (Untuk sekarang kita return dummy succes)
    # Nanti ini akan di-import dari pipeline AI kita
    return {
        "status": "success",
        "message": "Gambar diterima, diproses oleh AI pipeline",
        "filename": file.filename
    }
