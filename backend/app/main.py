import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.api import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dijalankan saat server start
    await init_db()
    yield
    # Dijalankan saat server stop

app = FastAPI(
    title="EpsonQC Vision API",
    description="Backend API for EpsonQC Vision Dashboard",
    version="1.0.0",
    lifespan=lifespan
)

# Konfigurasi CORS agar React (Vite) di localhost:5173/5174 bisa akses API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Nanti bisa disesuaikan ke localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {"message": "EpsonQC API is running. Go to /docs for Swagger UI."}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
