import cv2 as cv
import os
import numpy as np
from ultralytics import YOLO

# ==========================================
# INISIALISASI MODEL (Berjalan sekali saat server menyala)
# ==========================================
base_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(base_dir)
model_path = os.path.join(project_root, "ai_model", "runs", "gear", "weights", "best.pt")

print("Memuat Model YOLOv8 dan CLAHE...")
model = YOLO(model_path)
clahe = cv.createCLAHE(clipLimit=5.0, tileGridSize=(8, 8))

def proses_inspeksi_gambar(file_bytes):
    """
    Fungsi ini menerima data byte gambar, memprosesnya dengan CLAHE & YOLO,
    lalu mengembalikan jumlah part, confidence, dan gambar hasil coretan.
    """
    # 1. Konversi byte ke format gambar OpenCV
    nparr = np.frombuffer(file_bytes, np.uint8)
    img_asli = cv.imdecode(nparr, cv.IMREAD_COLOR)

    # 2. Proses CLAHE
    lab = cv.cvtColor(img_asli, cv.COLOR_BGR2LAB)
    l_channel, a, b = cv.split(lab)
    cl = clahe.apply(l_channel)
    merged_lab = cv.merge((cl, a, b))
    img_clahe = cv.cvtColor(merged_lab, cv.COLOR_LAB2BGR)

    # 3. Inferensi YOLOv8
    res = model.predict(source=img_clahe, show=False, verbose=False)
    frame_hasil = res[0].plot()
    
    # 4. Ekstraksi Data Kuantitas & Confidence
    jumlah_part = len(res[0].boxes)
    if jumlah_part > 0:
        rata_rata_conf = float(sum(res[0].boxes.conf) / len(res[0].boxes.conf)) * 100
    else:
        rata_rata_conf = 0.0

    # 5. Tambahkan Teks ke Gambar Hasil
    cv.putText(frame_hasil, f'Kuantitas: {jumlah_part}', (20, 50), cv.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)

    return img_asli, frame_hasil, jumlah_part, rata_rata_conf