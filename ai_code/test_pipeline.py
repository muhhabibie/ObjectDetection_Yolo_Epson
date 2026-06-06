import cv2 as cv
import matplotlib.pyplot as plt
import os
import sys

# Pastikan Python bisa menemukan vision_core.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from vision_core import proses_inspeksi_gambar

# Ganti dengan path gambar yang mau ditest
IMAGE_PATH = "../2.jpeg"
TARGET = 10

# Baca gambar sebagai bytes (sama seperti yang dikirim API)
with open(IMAGE_PATH, "rb") as f:
    file_bytes = f.read()

# Jalankan Pipeline
img_raw, img_hasil, jumlah, conf = proses_inspeksi_gambar(file_bytes, TARGET)

# Tampilkan 1 gambar hasil (Pipeline 4)
plt.figure(figsize=(10, 8))
plt.imshow(cv.cvtColor(img_hasil, cv.COLOR_BGR2RGB))
plt.title(f"Hasil Deteksi: {jumlah} part | Target: {TARGET} | Conf: {conf:.1f}%")
plt.axis("off")
plt.show()