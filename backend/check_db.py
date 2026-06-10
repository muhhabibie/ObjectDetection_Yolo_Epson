import asyncio
import sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import select
from app.database import async_session
from app.models import AuditLog, User, Inspection

async def check():
    async with async_session() as session:
        # Check users
        users_result = await session.execute(select(User))
        users = users_result.scalars().all()
        print("--- USERS ---")
        for u in users:
            print(f"ID: {u.id}, Username: {u.username}, Role: {u.role}")
            
        # Check inspections
        inspections_result = await session.execute(select(Inspection))
        inspections = inspections_result.scalars().all()
        print("\n--- INSPECTIONS ---")
        print(f"Total inspections: {len(inspections)}")
        for i in inspections:
            print(f"ID: {i.inspection_id}, Part: {i.part_name}, Expected: {i.expected_qty}, Detected: {i.detected_qty}, ImagePath: {i.image_path}, CreatedAt: {i.created_at}")

        # Check audit logs
        logs_result = await session.execute(select(AuditLog))
        logs = logs_result.scalars().all()
        print("\n--- AUDIT LOGS ---")
        print(f"Total log count: {len(logs)}")
        for log in logs:
            print(f"ID: {log.id}, User: {log.username}, Role: {log.role}, Action: {log.action}, CreatedAt: {log.created_at}, Details: {log.details}")
            
if __name__ == "__main__":
    asyncio.run(check())
