import os
import json
import asyncio
import asyncpg
from typing import Optional, List, Any, Dict
from dotenv import load_dotenv

load_dotenv()

# Global pool
_pool: Optional[asyncpg.Pool] = None

async def get_pool():
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                host=os.getenv("PG_HOST", "localhost"),
                port=int(os.getenv("PG_PORT", 5432)),
                database=os.getenv("PG_DATABASE", "cybershield"),
                user=os.getenv("PG_USER", "postgres"),
                password=os.getenv("PG_PASSWORD", "postgres"),
                min_size=1,
                max_size=10
            )
        except Exception as e:
            print(f"[Postgres] Error creating pool: {e}")
            raise e
    return _pool

async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

async def fetch_one(query: str, *args) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None

async def fetch_all(query: str, *args) -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *args)
        return [dict(r) for r in rows]

async def execute(query: str, *args) -> str:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.execute(query, *args)

async def notify_channel(channel: str, payload: Any):
    # In asyncpg, we use a simple SELECT to trigger a manual NOTIFY
    # or we can use the connection.execute('NOTIFY ...')
    pool = await get_pool()
    payload_str = json.dumps(payload, default=str)
    async with pool.acquire() as conn:
        await conn.execute(f"SELECT pg_notify($1, $2)", channel, payload_str)
