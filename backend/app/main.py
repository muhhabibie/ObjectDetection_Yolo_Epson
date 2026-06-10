import os
import sys
import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.database import init_db
from app.api import router
from app.utils.backup import backup_scheduler_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Jalankan database backup scheduler di background
    backup_task = asyncio.create_task(backup_scheduler_loop())
    try:
        yield
    finally:
        backup_task.cancel()
        try:
            await asyncio.gather(backup_task, return_exceptions=True)
        except asyncio.CancelledError:
            pass



app = FastAPI(
    title="EpsonQC Vision API",
    description="Backend API for EpsonQC Vision Dashboard",
    version="1.0.0",
    lifespan=lifespan
)

# CORS agar React (Vite) di localhost maupun HP (Wi-Fi/USB Cable) bisa akses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_to_static(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static"):
        origin = request.headers.get("origin", "*")
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Mount folder static agar gambar bisa diakses via URL
# Contoh: http://localhost:8000/static/images/raw/xxx.jpg
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(router)


# ── WebSockets Live Stream Manager ──
class StreamManager:
    def __init__(self):
        self.laptop_connections: list[WebSocket] = []

    async def connect_laptop(self, websocket: WebSocket):
        await websocket.accept()
        self.laptop_connections.append(websocket)

    def disconnect_laptop(self, websocket: WebSocket):
        if websocket in self.laptop_connections:
            self.laptop_connections.remove(websocket)

    async def send_to_laptops(self, data: bytes):
        for ws in self.laptop_connections:
            try:
                await ws.send_bytes(data)
            except Exception:
                pass

stream_manager = StreamManager()


@app.websocket("/ws/stream/laptop")
async def ws_stream_laptop(websocket: WebSocket):
    await stream_manager.connect_laptop(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        stream_manager.disconnect_laptop(websocket)


@app.websocket("/ws/stream/phone")
async def ws_stream_phone(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive image frame from phone
            data = await websocket.receive_bytes()
            # Broadcast to all laptop screens
            await stream_manager.send_to_laptops(data)
    except WebSocketDisconnect:
        pass


@app.get("/api/network-ips")
def get_network_ips():
    import socket
    import subprocess
    import re
    import sys
    
    ips = []
    interfaces = []
    
    # 1. Parse ipconfig on Windows to get all raw IPs
    if sys.platform == "win32":
        try:
            output = subprocess.check_output("ipconfig", shell=True, text=True, errors="ignore")
            for line in output.split('\n'):
                if "IPv4" in line:
                    match = re.search(r':\s*([\d\.]+)', line)
                    if match:
                        ip = match.group(1).strip()
                        if ip != "127.0.0.1" and ip not in ips:
                            ips.append(ip)
        except Exception:
            pass

    # 2. Get detailed mapping on Windows using PowerShell
    if sys.platform == "win32":
        try:
            ip_to_name = {}
            output_ips = subprocess.check_output(
                ["powershell", "-Command", "Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress, InterfaceAlias"],
                text=True, errors="ignore"
            )
            for line in output_ips.split('\n'):
                line = line.strip()
                parts = re.split(r'\s{2,}', line)
                if len(parts) >= 2:
                    ip, name = parts[0].strip(), parts[1].strip()
                    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip):
                        ip_to_name[ip] = name
                        
            name_to_desc = {}
            output_adapters = subprocess.check_output(
                ["powershell", "-Command", "Get-NetAdapter | Select-Object Name, InterfaceDescription"],
                text=True, errors="ignore"
            )
            for line in output_adapters.split('\n'):
                line = line.strip()
                parts = re.split(r'\s{2,}', line)
                if len(parts) >= 2:
                    name, desc = parts[0].strip(), parts[1].strip()
                    name_to_desc[name] = desc
                    
            for ip, name in ip_to_name.items():
                if ip == "127.0.0.1":
                    continue
                desc = name_to_desc.get(name, "")
                interfaces.append({
                    "ip": ip,
                    "name": name,
                    "description": desc
                })
        except Exception:
            pass

    # 3. Fallback/Standard socket methods
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None):
            ip = info[4][0]
            if ":" not in ip and ip != "127.0.0.1":
                if ip not in ips:
                    ips.append(ip)
    except Exception:
        pass
    
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if ip != "127.0.0.1" and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
        
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip != "127.0.0.1" and ip not in ips:
            ips.append(ip)
    except Exception:
        pass
        
    # Standardize list of raw IPs
    for item in interfaces:
        ip = item["ip"]
        if ip not in ips:
            ips.append(ip)
            
    return {"ips": ips, "interfaces": interfaces}




@app.get("/")
def root():
    return {"message": "EpsonQC API is running. Go to /docs for Swagger UI."}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
