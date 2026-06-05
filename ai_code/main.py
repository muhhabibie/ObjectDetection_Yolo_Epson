import os
import uuid
import cv2 as cv
import psycopg2
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form

# Mengimpor fungsi AI dari file sebelah
from vision_core import proses_inspeksi_gambar

app = FastAPI(title="Epson QC API")

# Konfigurasi Database
DB_CONFIG = {
    "dbname": "epson_qc_db",
    "user": "postgres",
    "password": "password_kalian",
    "host": "localhost",
    "port": "5432"
}

# Direktori Penyimpanan Gambar
base_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(base_dir)
raw_dir = os.path.join(project_root, "image", "images_raw")
res_dir = os.path.join(project_root, "image", "images_result")
os.makedirs(raw_dir, exist_ok=True)
os.makedirs(res_dir, exist_ok=True)

# Tambahan parameter target_kuantitas pada endpoint
@app.post("/api/verify_part")
async def verify_part(
    file: UploadFile = File(...), 
    nama_barang: str = Form("Gear Roller"),
    target_kuantitas: int = Form(...) # <--- Standar pabrik (misal: 12)
):
    # 1. Siapkan Metadata
    inspeksi_id = str(uuid.uuid4())
    waktu_sekarang = datetime.now()
    
    # 2. Baca isi file yang diupload
    isi_file = await file.read()

    # 3. Panggil proses AI dari vision_core.py
    img_raw, img_res, jumlah_part, conf = proses_inspeksi_gambar(isi_file)

    # ==========================================
    # 4. HITUNG ABSOLUTE ERROR (Untuk MAE)
    # ==========================================
    # Menghitung selisih absolut antara deteksi AI dengan standar pabrik
    absolute_error = abs(jumlah_part - target_kuantitas)

    # 5. Simpan File Fisik Gambar
    filename = f"{inspeksi_id}.jpg"
    cv.imwrite(os.path.join(raw_dir, filename), img_raw)
    cv.imwrite(os.path.join(res_dir, filename), img_res)

    # 6. Simpan ke Database
    db_raw_url = f"/images_raw/{filename}"
    db_res_url = f"/images_result/{filename}"

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Query ditambahkan kolom target_kuantitas dan absolute_error
        insert_query = """
            INSERT INTO laporan_qc 
            (id, nama_barang, target_kuantitas, hasil_hitung, absolute_error, confidence, image_raw, image_result, waktu_inspeksi) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (
            inspeksi_id, nama_barang, target_kuantitas, jumlah_part, absolute_error, round(conf, 2), 
            db_raw_url, db_res_url, waktu_sekarang
        ))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        return {"status": "error", "message": f"Database Error: {str(e)}"}

    # 7. Kembalikan Respons JSON Lengkap ke Dashboard
    return {
        "status": "success",
        "data": {
            "id": inspeksi_id,
            "nama_barang": nama_barang,
            "target_kuantitas": target_kuantitas,
            "jumlah_terdeteksi": jumlah_part,
            "absolute_error": absolute_error,
            "confidence_persen": round(conf, 2),
            "waktu": waktu_sekarang.strftime("%Y-%m-%d %H:%M:%S"),
            "url_hasil": db_res_url
        }
    }