from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import ASYNC_DATABASE_URL

engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency: yields an async DB session per request."""
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default users if they don't exist
    import uuid
    from sqlalchemy import select
    from app.models import User
    from app.utils.security import hash_password

    async with async_session() as session:
        default_users = [
            {"username": "qcepson", "email": "qcepson@epson.com", "pass": "qcepson123", "role": "qc_epson"},
            {"username": "storageepson", "email": "storageepson@epson.com", "pass": "storageepson123", "role": "storage_epson"},
            {"username": "vendor", "email": "vendor@epson.com", "pass": "vendor123", "role": "vendor"},
            {"username": "admin", "email": "admin@epson.com", "pass": "admin123", "role": "qc_epson"}
        ]
        
        for u in default_users:
            res = await session.execute(select(User).where(User.username == u["username"]))
            if not res.scalar():
                new_user = User(
                    id=uuid.uuid4(),
                    username=u["username"],
                    email=u["email"],
                    password_hash=hash_password(u["pass"]),
                    role=u["role"]
                )
                session.add(new_user)
                print(f"Seeding user: {u['username']} ({u['role']})")
                
        await session.commit()
        print("Database user seeding check completed.")
