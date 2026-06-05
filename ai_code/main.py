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

@app.post("/api/verify_part")
async def verify_part(file: UploadFile = File(...), nama_barang: str = Form("Gear Roller")):
    # 1. Siapkan Metadata
    inspeksi_id = str(uuid.uuid4())
    waktu_sekarang = datetime.now()
    
    # 2. Baca isi file yang diupload
    isi_file = await file.read()

    # ==========================================
    # 3. PANGGIL PROSES AI DARI VISION_CORE.PY
    # ==========================================
    img_raw, img_res, jumlah, conf = proses_inspeksi_gambar(isi_file)

    # 4. Simpan File Fisik Gambar
    filename = f"{inspeksi_id}.jpg"
    cv.imwrite(os.path.join(raw_dir, filename), img_raw)
    cv.imwrite(os.path.join(res_dir, filename), img_res)

    # 5. Simpan ke Database
    db_raw_url = f"/images_raw/{filename}"
    db_res_url = f"/images_result/{filename}"

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        insert_query = """
            INSERT INTO laporan_qc 
            (id, nama_barang, hasil_hitung, confidence, image_raw, image_result, waktu_inspeksi) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (
            inspeksi_id, nama_barang, jumlah, round(conf, 2), 
            db_raw_url, db_res_url, waktu_sekarang
        ))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        return {"status": "error", "message": f"Database Error: {str(e)}"}

    # 6. Kembalikan Respons ke Dashboard
    return {
        "status": "success",
        "data": {
            "id": inspeksi_id,
            "nama_barang": nama_barang,
            "jumlah_part": jumlah,
            "confidence_persen": round(conf, 2),
            "waktu": waktu_sekarang.strftime("%Y-%m-%d %H:%M:%S"),
            "url_hasil": db_res_url
        }
    }