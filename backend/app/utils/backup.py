import os
import asyncio
import datetime
import shutil
from app.database import async_session
from app.models import AuditLog

def find_pg_dump():
    # Check default path first (PostgreSQL 17)
    default_path = r"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
    if os.path.exists(default_path):
        return default_path
    
    # Check other potential PostgreSQL version paths
    pg_base = r"C:\Program Files\PostgreSQL"
    if os.path.exists(pg_base):
        try:
            for version in os.listdir(pg_base):
                path = os.path.join(pg_base, version, "bin", "pg_dump.exe")
                if os.path.exists(path):
                    return path
        except Exception:
            pass
            
    # Try finding in PATH
    path_in_env = shutil.which("pg_dump")
    if path_in_env:
        return path_in_env
    
    return None

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backups")

async def run_backup():
    pg_dump_path = find_pg_dump()
    if not pg_dump_path:
        print(f"[{datetime.datetime.now()}] Gagal memulai backup: pg_dump.exe tidak ditemukan di sistem.")
        return False

    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(BACKUP_DIR, f"epsonqc_backup_{timestamp}.sql")
        
        # Build command: pg_dump -U postgres -d epsonqc -F p (plain text SQL)
        cmd = [
            pg_dump_path,
            "-U", "postgres",
            "-h", "localhost",
            "-p", "5432",
            "-d", "epsonqc",
            "-f", backup_file
        ]
        
        # Set password via env variable PGPASSWORD
        env = os.environ.copy()
        env["PGPASSWORD"] = "Masuk1234"
        
        import subprocess

        def do_backup():
            return subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                errors='ignore'
            )

        result = await asyncio.to_thread(do_backup)
        
        if result.returncode == 0:
            print(f"[{datetime.datetime.now()}] Backup database berhasil dibuat: {backup_file}")
            clean_old_backups()
            try:
                async with async_session() as session:
                    log_entry = AuditLog(
                        username="system",
                        role="system",
                        action="AUTO_BACKUP",
                        details=f"Backup database terjadwal berhasil dibuat: {os.path.basename(backup_file)}"
                    )
                    session.add(log_entry)
                    await session.commit()
            except Exception as e:
                print(f"Gagal mencatat log backup: {e}")
            return True
        else:
            print(f"[{datetime.datetime.now()}] Backup database gagal: {result.stderr}")
            try:
                async with async_session() as session:
                    log_entry = AuditLog(
                        username="system",
                        role="system",
                        action="BACKUP_ERROR",
                        details=f"Backup database otomatis gagal. Error: {result.stderr[:200]}"
                    )
                    session.add(log_entry)
                    await session.commit()
            except Exception as db_err:
                print(f"Gagal mencatat log error backup: {db_err}")
            return False
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[{datetime.datetime.now()}] Error saat melakukan backup database: {e}")
        return False

def clean_old_backups():
    try:
        if not os.path.exists(BACKUP_DIR):
            return
        files = [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.startswith("epsonqc_backup_") and f.endswith(".sql")]
        files.sort(key=os.path.getmtime)
        while len(files) > 7:
            oldest_file = files.pop(0)
            os.remove(oldest_file)
            print(f"Menghapus backup lama: {oldest_file}")
    except Exception as e:
        print(f"Gagal membersihkan backup lama: {e}")

async def backup_scheduler_loop():
    # Delay 15 detik saat startup agar tidak bentrok dengan inisialisasi awal DB
    await asyncio.sleep(15)
    while True:
        await run_backup()
        # Jadwal berkala: setiap 12 jam (43200 detik)
        await asyncio.sleep(43200)
