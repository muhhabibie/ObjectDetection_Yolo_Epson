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

    # Seed default user if none exists
    import uuid
    from sqlalchemy import select
    from app.models import User
    from app.utils.security import hash_password

    async with async_session() as session:
        result = await session.execute(select(User).limit(1))
        if not result.scalar():
            default_user = User(
                id=uuid.uuid4(),
                username="admin",
                email="admin@epson.com",
                password_hash=hash_password("admin123"),
                role="admin"
            )
            session.add(default_user)
            await session.commit()
            print("Database initialized: seeded admin@epson.com / admin123")
