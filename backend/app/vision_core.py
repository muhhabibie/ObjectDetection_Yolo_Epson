import cv2 as cv
import os
import numpy as np
from ultralytics import YOLO

# ==========================================
# PATH MODEL — relatif dari root project
# ==========================================
base_dir = os.path.dirname(os.path.abspath(__file__))          # backend/app/
project_root = os.path.dirname(os.path.dirname(base_dir))      # capstone/
model_path = os.path.join(project_root, "ai_model", "runs", "gear", "weights", "best.pt")

print(f"[vision_core] Memuat model dari: {model_path}")
model = YOLO(model_path)
clahe = cv.createCLAHE(clipLimit=5.0, tileGridSize=(8, 8))
print("[vision_core] Model siap!")


def proses_inspeksi_gambar(file_bytes: bytes):
    """
    Menerima byte gambar, memproses dengan CLAHE & YOLOv8.

    Returns:
        img_raw     : numpy array gambar asli (BGR)
        img_result  : numpy array gambar dengan anotasi deteksi (BGR)
        jumlah_part : int, jumlah objek yang terdeteksi
        rata_conf   : float, rata-rata confidence (0-100)
    """
    # 1. Konversi byte → OpenCV image
    nparr = np.frombuffer(file_bytes, np.uint8)
    img_raw = cv.imdecode(nparr, cv.IMREAD_COLOR)

    # 2. CLAHE — perbaiki kontras/pencahayaan
    lab = cv.cvtColor(img_raw, cv.COLOR_BGR2LAB)
    l_channel, a, b = cv.split(lab)
    cl = clahe.apply(l_channel)
    merged_lab = cv.merge((cl, a, b))
    img_clahe = cv.cvtColor(merged_lab, cv.COLOR_LAB2BGR)

    # 3. Inferensi YOLOv8
    results = model.predict(source=img_clahe, show=False, verbose=False)
    img_result = results[0].plot()  # gambar dengan bounding box

    # 4. Hitung kuantitas & confidence
    jumlah_part = len(results[0].boxes)
    if jumlah_part > 0:
        rata_conf = float(results[0].boxes.conf.mean()) * 100
    else:
        rata_conf = 0.0

    # 5. Tambahkan teks kuantitas di gambar hasil
    cv.putText(
        img_result,
        f"Terdeteksi: {jumlah_part} gear  |  Conf: {rata_conf:.1f}%",
        (20, 50),
        cv.FONT_HERSHEY_SIMPLEX,
        1.2,
        (0, 255, 0),
        3
    )

    return img_raw, img_result, jumlah_part, rata_conf
