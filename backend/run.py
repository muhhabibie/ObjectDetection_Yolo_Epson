import sys
import asyncio

if sys.platform == "win32":
    # Force the event loop policy to use SelectorEventLoop
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        from uvicorn.loops import asyncio as uv_asyncio
        uv_asyncio.asyncio_loop_factory = asyncio.SelectorEventLoop
    except Exception as e:
        print(f"Warning: failed to patch uvicorn loop factory: {e}")

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
