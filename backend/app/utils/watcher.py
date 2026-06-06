import os
import uuid
import time
import random
import asyncio
import cv2 as cv
from app.database import async_session
from app.models import Inspection
from app.api import ACTIVE_SETTINGS
from app.vision_core import proses_inspeksi_gambar

# Path folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # backend/
PROJECT_ROOT = os.path.dirname(BASE_DIR) # project root
WATCH_DIR = os.path.join(PROJECT_ROOT, "watch_folder")

STATIC_RAW_DIR = os.path.join(BASE_DIR, "static", "images", "raw")
STATIC_RES_DIR = os.path.join(BASE_DIR, "static", "images", "result")

# Pastikan folder watch_folder ada
os.makedirs(WATCH_DIR, exist_ok=True)
os.makedirs(STATIC_RAW_DIR, exist_ok=True)
os.makedirs(STATIC_RES_DIR, exist_ok=True)


async def check_file_fully_copied(filepath: str, wait_sec: float = 0.5) -> bool:
    """Memastikan file sudah ter-copy sempurna ke PC (ukurannya tidak berubah lagi)"""
    try:
        if not os.path.exists(filepath):
            return False
        
        size1 = os.path.getsize(filepath)
        await asyncio.sleep(wait_sec)
        size2 = os.path.getsize(filepath)
        
        # Jika ukuran stabil dan > 0, berarti aman untuk diproses
        return size1 == size2 and size1 > 0
    except Exception:
        return False


async def folder_watcher_loop():
    """Loop pemantau folder watch_folder di background"""
    print(f"[folder_watcher] Memulai pemantauan di: {WATCH_DIR}")
    
    while True:
        try:
            # Ambil semua file gambar di watch_folder
            files = [
                f for f in os.listdir(WATCH_DIR)
                if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
            ]
            
            for file_name in files:
                filepath = os.path.join(WATCH_DIR, file_name)
                
                # Cek apakah file sudah ter-copy dengan sempurna
                if not await check_file_fully_copied(filepath):
                    continue
                
                print(f"[folder_watcher] Mendeteksi foto baru: {file_name}")
                
                # Baca byte file gambar
                with open(filepath, "rb") as f:
                    file_bytes = f.read()
                
                start_time = time.time()
                
                # Jalankan inspeksi AI
                try:
                    img_raw, img_result, detected_qty, avg_confidence = proses_inspeksi_gambar(file_bytes)
                except Exception as e:
                    print(f"[folder_watcher] Gagal proses AI: {e}")
                    # Hapus file yang rusak agar tidak menyumbat loop
                    os.remove(filepath)
                    continue
                
                processing_time = round(time.time() - start_time, 3)
                
                # Simpan gambar secara lokal di static
                file_id = str(uuid.uuid4())
                filename = f"{file_id}.jpg"
                
                raw_filepath = os.path.join(STATIC_RAW_DIR, filename)
                cv.imwrite(raw_filepath, img_raw)
                
                res_filepath = os.path.join(STATIC_RES_DIR, filename)
                cv.imwrite(res_filepath, img_result)
                
                # Tentukan path URL untuk frontend
                image_path = f"/static/images/raw/{filename}"
                image_result_path = f"/static/images/result/{filename}"
                
                # Dapatkan parameter aktif saat ini dari global settings
                part_name = ACTIVE_SETTINGS.get("part_name", "Gear Roller") or "Gear Roller"
                expected_qty = ACTIVE_SETTINGS.get("expected_qty", 12)
                try:
                    expected_qty = int(expected_qty)
                except Exception:
                    expected_qty = 12
                
                discrepancy = detected_qty - expected_qty
                is_match = (detected_qty == expected_qty)
                inspection_id = f"INS-{random.randint(10000, 99999)}"
                
                # Simpan data ke Database
                async with async_session() as session:
                    db_insp = Inspection(
                        inspection_id=inspection_id,
                        part_name=part_name,
                        batch_id=None,
                        expected_qty=expected_qty,
                        detected_qty=detected_qty,
                        discrepancy=discrepancy,
                        is_match=is_match,
                        average_confidence=round(avg_confidence / 100, 4),
                        image_path=image_path,
                        image_result_path=image_result_path,
                        processing_time_sec=processing_time
                    )
                    session.add(db_insp)
                    await session.commit()
                    print(f"[folder_watcher] Sukses memproses {file_name} -> {inspection_id} ({detected_qty} gear terdeteksi)")
                
                # Hapus file asli dari watch_folder agar tidak diproses berulang
                try:
                    os.remove(filepath)
                except Exception as e:
                    print(f"[folder_watcher] Peringatan: Gagal menghapus file sumber: {e}")
                    
        except Exception as e:
            print(f"[folder_watcher] Error di thread pemantau: {e}")
            
        await asyncio.sleep(1.0)
