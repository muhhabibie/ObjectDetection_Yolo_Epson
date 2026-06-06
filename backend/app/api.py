import os
import uuid
import time
import random
import cv2 as cv
from typing import List
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Inspection, User
from app.schemas import (
    InspectionCreate,
    InspectionResponse,
    DashboardStats,
    LoginRequest,
    ActiveSettingsUpdate
)
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(prefix="/api", tags=["inspections"])


ACTIVE_SETTINGS = {
    "part_name": "Gear Roller",
    "expected_qty": 12
}


@router.get("/active-settings")
def get_active_settings():
    return ACTIVE_SETTINGS


@router.post("/active-settings")
def update_active_settings(settings: ActiveSettingsUpdate):
    ACTIVE_SETTINGS["part_name"] = settings.part_name
    ACTIVE_SETTINGS["expected_qty"] = settings.expected_qty
    return ACTIVE_SETTINGS


@router.post("/scan-frame/")
async def scan_frame(file: UploadFile = File(...)):
    """
    Endpoint ringan untuk auto-trigger kamera.
    Menerima frame dari HP, cek apakah ada gear — TANPA simpan ke DB.
    Dipakai oleh halaman Capture untuk polling deteksi otomatis.
    """
    import numpy as np
    from app.vision_core import model, clahe

    file_bytes = await file.read()
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv.imdecode(nparr, cv.IMREAD_COLOR)

    if img is None:
        return {"detected": False, "count": 0, "confidence": 0.0}

    # CLAHE preprocessing
    lab = cv.cvtColor(img, cv.COLOR_BGR2LAB)
    l, a, b = cv.split(lab)
    cl = clahe.apply(l)
    img_clahe = cv.cvtColor(cv.merge((cl, a, b)), cv.COLOR_LAB2BGR)

    # Deteksi cepat
    results = model.predict(source=img_clahe, show=False, verbose=False)
    count = len(results[0].boxes)
    confidence = 0.0
    if count > 0:
        confidence = float(results[0].boxes.conf.mean()) * 100

    return {
        "detected": count > 0,
        "count": count,
        "confidence": round(confidence, 1)
    }

# Path folder static untuk menyimpan gambar
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
STATIC_RAW_DIR = os.path.join(BASE_DIR, "static", "images", "raw")
STATIC_RES_DIR = os.path.join(BASE_DIR, "static", "images", "result")
os.makedirs(STATIC_RAW_DIR, exist_ok=True)
os.makedirs(STATIC_RES_DIR, exist_ok=True)


@router.post("/login")
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(
            (User.email == credentials.email) | (User.username == credentials.email)
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })

    return {"access_token": token, "token_type": "bearer"}


@router.post("/inspections/", response_model=InspectionResponse)
async def create_inspection(
    inspection: InspectionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Endpoint untuk menyimpan hasil deteksi AI ke database."""
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
        image_result_path=inspection.image_result_path,
        processing_time_sec=inspection.processing_time_sec
    )

    db.add(db_insp)
    await db.commit()
    await db.refresh(db_insp)
    return db_insp


@router.delete("/inspections/{id}")
async def delete_single_inspection(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Inspection).where(Inspection.id == id))
    db_insp = result.scalar_one_or_none()
    if not db_insp:
        raise HTTPException(status_code=404, detail="Inspection not found")

    try:
        if db_insp.image_path:
            filename = os.path.basename(db_insp.image_path)
            filepath = os.path.join(STATIC_RAW_DIR, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        if db_insp.image_result_path:
            filename = os.path.basename(db_insp.image_result_path)
            filepath = os.path.join(STATIC_RES_DIR, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
    except Exception as e:
        print(f"Error deleting files: {e}")

    await db.delete(db_insp)
    await db.commit()
    return {"message": f"Successfully deleted inspection {id}"}


@router.delete("/inspections/")
async def delete_all_inspections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Inspection))
    inspections = result.scalars().all()
    
    for db_insp in inspections:
        try:
            if db_insp.image_path:
                filename = os.path.basename(db_insp.image_path)
                filepath = os.path.join(STATIC_RAW_DIR, filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
            if db_insp.image_result_path:
                filename = os.path.basename(db_insp.image_result_path)
                filepath = os.path.join(STATIC_RES_DIR, filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
        except Exception as e:
            print(f"Error deleting files for inspection {db_insp.id}: {e}")

    from sqlalchemy import delete
    await db.execute(delete(Inspection))
    await db.commit()
    return {"message": "Successfully cleared all inspection history"}


@router.get("/inspections/", response_model=List[InspectionResponse])
async def get_all_inspections(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Endpoint untuk mengambil semua data riwayat inspeksi."""
    result = await db.execute(
        select(Inspection)
        .order_by(Inspection.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Menghitung KPI Dashboard dari DB PostgreSQL"""

    total_result = await db.execute(select(func.count(Inspection.id)))
    total = total_result.scalar() or 0

    if total == 0:
        return DashboardStats(total_inspections=0, accuracy=0.0, mae=0.0, discrepancies=0)

    match_result = await db.execute(
        select(func.count(Inspection.id)).where(Inspection.is_match == True)
    )
    matches = match_result.scalar() or 0
    accuracy = (matches / total) * 100
    discrepancies = total - matches

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


@router.post("/upload-camera/", response_model=InspectionResponse)
async def upload_camera_image(
    file: UploadFile = File(...),
    part_name: str = Form(...),
    expected_qty: int = Form(...),
    batch_id: str = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint utama — menerima gambar dari kamera, memproses dengan AI,
    menyimpan dua gambar (raw + hasil deteksi), dan mencatat ke database.

    Alur:
    1. Terima gambar dari kamera
    2. Simpan gambar RAW
    3. Proses dengan CLAHE + YOLOv8
    4. Simpan gambar RESULT (dengan bounding box)
    5. Simpan rekaman ke database
    6. Return data inspeksi lengkap
    """
    # Import di sini untuk menghindari load model saat startup jika tidak diperlukan
    from app.vision_core import proses_inspeksi_gambar

    # 1. Baca konten file dari kamera
    file_bytes = await file.read()
    start_time = time.time()

    # 2. Proses AI: CLAHE + YOLOv8
    try:
        img_raw, img_result, detected_qty, avg_confidence = proses_inspeksi_gambar(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")

    processing_time = round(time.time() - start_time, 3)

    # 3. Generate nama file unik
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.jpg"

    # 4. Simpan gambar RAW
    raw_filepath = os.path.join(STATIC_RAW_DIR, filename)
    cv.imwrite(raw_filepath, img_raw)

    # 5. Simpan gambar RESULT (dengan bounding box deteksi)
    res_filepath = os.path.join(STATIC_RES_DIR, filename)
    cv.imwrite(res_filepath, img_result)

    # 6. URL path untuk diakses frontend
    image_path = f"/static/images/raw/{filename}"
    image_result_path = f"/static/images/result/{filename}"

    # 7. Simpan ke database
    insp_id = f"INS-{random.randint(10000, 99999)}"
    db_insp = Inspection(
        inspection_id=insp_id,
        part_name=part_name,
        batch_id=batch_id,
        expected_qty=expected_qty,
        detected_qty=detected_qty,
        discrepancy=detected_qty - expected_qty,
        is_match=detected_qty == expected_qty,
        average_confidence=round(avg_confidence / 100, 4),  # simpan dalam 0-1
        image_path=image_path,
        image_result_path=image_result_path,
        processing_time_sec=processing_time
    )

    db.add(db_insp)
    await db.commit()
    await db.refresh(db_insp)
    return db_insp
