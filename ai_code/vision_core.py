import cv2 as cv
import os
import numpy as np
from collections import Counter
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

# ==========================================
# 1. INISIALISASI MODEL & PARAMETER
# ==========================================
base_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(base_dir)
model_path = os.path.join(project_root, "ai_model", "runs", "gear", "weights", "best.pt")

print("Memuat Model YOLOv8 dan Mesin SAHI (Ensemble Mode)...")

# Device diset ke CPU agar aman diuji coba di laptop backend
DEVICE = "cpu"

model_yolo = YOLO(model_path)
model_sahi = AutoDetectionModel.from_pretrained(
    model_type='yolov8',
    model_path=model_path,
    confidence_threshold=0.35, 
    device=DEVICE 
)

clahe = cv.createCLAHE(clipLimit=5.0, tileGridSize=(8, 8))

# Parameter Area Filtering
MIN_AREA = 3500
MAX_AREA = 90000

# Parameter target_pabrik=20 memastikan jika main.py tidak mengirimkan target, 
# sistem otomatis memakai 20 sehingga tidak error.
def proses_inspeksi_gambar(file_bytes, target_pabrik=20):
    """
    Menjalankan 4 Pipeline Ensemble tanpa mengubah format output 
    yang dibutuhkan oleh backend FastAPI.
    """
    # 1. Dekode Gambar Raw
    nparr = np.frombuffer(file_bytes, np.uint8)
    img_asli = cv.imdecode(nparr, cv.IMREAD_COLOR)

    # 2. Pre-processing CLAHE
    lab = cv.cvtColor(img_asli, cv.COLOR_BGR2LAB)
    l_channel, a, b = cv.split(lab)
    img_clahe = cv.cvtColor(cv.merge((clahe.apply(l_channel), a, b)), cv.COLOR_LAB2BGR)
    
    img_rgb_asli = cv.cvtColor(img_asli, cv.COLOR_BGR2RGB)
    img_rgb_clahe = cv.cvtColor(img_clahe, cv.COLOR_BGR2RGB)

    # ==========================================
    # 3. EKSEKUSI 4 PIPELINE
    # ==========================================
    # Pipeline 1: YOLO Standar
    res_p1 = model_yolo.predict(source=img_asli, show=False, verbose=False, device=DEVICE, iou=0.45, conf=0.35)
    count_1 = len(res_p1[0].boxes)

    # Pipeline 2: YOLO + CLAHE
    res_p2 = model_yolo.predict(source=img_clahe, show=False, verbose=False, device=DEVICE, iou=0.45, conf=0.35)
    count_2 = len(res_p2[0].boxes)

    # Pipeline 3: YOLO + SAHI
    res_p3 = get_sliced_prediction(
        img_rgb_asli, model_sahi, slice_height=512, slice_width=512,
        overlap_height_ratio=0.44, overlap_width_ratio=0.44,
        postprocess_type="NMS", postprocess_match_metric="IOS", postprocess_match_threshold=0.42, verbose=0
    )
    count_3 = sum(1 for obj in res_p3.object_prediction_list if MIN_AREA <= obj.bbox.area <= MAX_AREA)

    # Pipeline 4: YOLO + CLAHE + SAHI (Fokus Utama untuk Gambar Result)
    res_p4 = get_sliced_prediction(
        img_rgb_clahe, model_sahi, slice_height=512, slice_width=512,
        overlap_height_ratio=0.44, overlap_width_ratio=0.44,
        postprocess_type="NMS", postprocess_match_metric="IOS", postprocess_match_threshold=0.42, verbose=0
    )
    
    valid_p4_objects = [obj for obj in res_p4.object_prediction_list if MIN_AREA <= obj.bbox.area <= MAX_AREA]
    count_4 = len(valid_p4_objects)

    # ==========================================
    # 4. SISTEM VOTING (FINAL DECISION)
    # ==========================================
    suara = [count_1, count_2, count_3, count_4]
    hitung_suara = Counter(suara)
    suara_terbanyak = hitung_suara.most_common()

    is_tie = len(suara_terbanyak) > 1 and suara_terbanyak[0][1] == suara_terbanyak[1][1]

    if is_tie:
        if target_pabrik in suara:
            keputusan_final = target_pabrik
        else:
            keputusan_final = count_4
    else:
        keputusan_final = suara_terbanyak[0][0]

    # ==========================================
    # 5. VISUALISASI GAMBAR HASIL (Hanya dari P4)
    # ==========================================
    frame_hasil = img_clahe.copy()
    rata_rata_conf = 0.0

    if count_4 > 0:
        total_conf = 0
        for obj in valid_p4_objects:
            x1, y1, x2, y2 = int(obj.bbox.minx), int(obj.bbox.miny), int(obj.bbox.maxx), int(obj.bbox.maxy)
            cv.rectangle(frame_hasil, (x1, y1), (x2, y2), (0, 255, 0), 2)
            total_conf += obj.score.value
        rata_rata_conf = (total_conf / count_4) * 100

    # Teks Laporan di Gambar
    status_teks = "PASS" if keputusan_final == target_pabrik else "DEFECT"
    warna_teks = (0, 255, 0) if keputusan_final == target_pabrik else (0, 0, 255)
    
    cv.putText(frame_hasil, f'Final QC: {keputusan_final} Part [{status_teks}]', (20, 60), cv.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 6)
    cv.putText(frame_hasil, f'Final QC: {keputusan_final} Part [{status_teks}]', (20, 60), cv.FONT_HERSHEY_SIMPLEX, 1.5, warna_teks, 2)

    # Mengembalikan 4 variabel yang persis ditunggu oleh main.py backend
    return img_asli, frame_hasil, keputusan_final, rata_rata_conf