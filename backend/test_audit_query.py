import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.database import async_session
from sqlalchemy import select
from app.models import AuditLog
from app.schemas import AuditLogResponse

async def go():
    async with async_session() as s:
        try:
            res = await s.execute(select(AuditLog))
            logs = res.scalars().all()
            print("Logs fetched successfully:", len(logs))
            for l in logs:
                # Test schema conversion
                pydantic_log = AuditLogResponse.model_validate(l)
                print("Serialized log:", pydantic_log)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(go())
