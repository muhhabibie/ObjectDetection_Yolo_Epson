import cv2 as cv
import os
import glob
from ultralytics import YOLO

# ==========================================
# 1. PENGATURAN DIREKTORI & MODEL
# ==========================================
# Direktori tempat file python ini berada (folder 'ai_code')
script_dir = os.path.dirname(os.path.abspath(__file__))

# Naik satu tingkat ke folder utama proyek
project_root = os.path.dirname(script_dir)

# Folder input dan output sesuai struktur baru
input_folder = os.path.join(project_root, "image", "images_raw") 
output_folder = os.path.join(project_root, "image", "images_result")

if not os.path.exists(input_folder):
    os.makedirs(input_folder)
    print(f"Folder '{input_folder}' berhasil dibuat. Masukkan gambar tes ke sana!")
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# Memuat model YOLOv8 dari folder ai_model
print("\nMemuat model YOLOv8...")
model_path = os.path.join(project_root, "ai_model", "runs", "gear", "weights", "best.pt")
model = YOLO(model_path)

clahe = cv.createCLAHE(clipLimit=5.0, tileGridSize=(8, 8))

# ==========================================
# 2. PROSES DETEKSI & PERBANDINGAN
# ==========================================
image_paths = glob.glob(os.path.join(input_folder, '*.[jJ][pP]*[gG]')) + \
              glob.glob(os.path.join(input_folder, '*.[pP][nN][gG]'))

if not image_paths:
    print(f"\n[INFO] Belum ada gambar di folder: {input_folder}")
else:
    print(f"\nDitemukan {len(image_paths)} gambar. Memulai proses verifikasi kuantitas A/B Testing...\n")

for img_path in image_paths:
    filename = os.path.basename(img_path)
    
    img_asli = cv.imread(img_path)
    if img_asli is None: 
        continue

    # --- TAHAP 1: PROSES CLAHE ---
    lab = cv.cvtColor(img_asli, cv.COLOR_BGR2LAB)
    l_channel, a, b = cv.split(lab)
    cl = clahe.apply(l_channel)
    merged_lab = cv.merge((cl, a, b))
    img_clahe = cv.cvtColor(merged_lab, cv.COLOR_LAB2BGR)

    # --- TAHAP 2: INFERENSI YOLOv8 & PENGHITUNGAN KUANTITAS ---
    # Deteksi pada gambar Asli
    res_asli = model.predict(source=img_asli, show=False, verbose=False)
    frame_asli = res_asli[0].plot() 
    jumlah_asli = len(res_asli[0].boxes) # <--- Ekstrak jumlah part

    # Deteksi pada gambar CLAHE
    res_clahe = model.predict(source=img_clahe, show=False, verbose=False)
    frame_clahe = res_clahe[0].plot()
    jumlah_clahe = len(res_clahe[0].boxes) # <--- Ekstrak jumlah part

    # --- TAHAP 3: PENGGABUNGAN VISUAL ---
    # Siapkan teks yang berisi label dan jumlah kuantitas
    teks_asli = f'Original: {jumlah_asli} Part'
    teks_clahe = f'CLAHE: {jumlah_clahe} Part'

    # Tambahkan teks ke masing-masing gambar 
    cv.putText(frame_asli, teks_asli, (20, 60), cv.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 6) # Outline Merah
    cv.putText(frame_asli, teks_asli, (20, 60), cv.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 2) # Teks Putih

    cv.putText(frame_clahe, teks_clahe, (20, 60), cv.FONT_HERSHEY_SIMPLEX, 1.5, (0, 200, 0), 6) # Outline Hijau
    cv.putText(frame_clahe, teks_clahe, (20, 60), cv.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 2) # Teks Putih

    gambar_perbandingan = cv.hconcat([frame_asli, frame_clahe])

    output_path = os.path.join(output_folder, f"banding_{filename}")
    cv.imwrite(output_path, gambar_perbandingan)
    
    # Cetak laporan hasil perhitungan ke terminal
    print(f"[SELESAI] {filename} -> Asli terdeteksi {jumlah_asli} part | CLAHE terdeteksi {jumlah_clahe} part")

print("\nSeluruh proses selesai! Buka folder 'image/images_result' untuk melihat hasilnya.")