import asyncio
import json
from db.postgres import get_pool

async def listen_for_incidents():
    """
    Listens for PostgreSQL NOTIFY events on the 'new_incident' channel.
    This can be used to push updates to a WebSocket or other real-time system.
    """
    print("[NotifyListener] Starting listener...")
    pool = await get_pool()
    
    async with pool.acquire() as conn:
        # Register a listener on the 'new_incident' channel
        await conn.add_listener('new_incident', lambda *args: on_notification(*args))
        await conn.add_listener('women_safety_alert', lambda *args: on_women_safety_alert(*args))
        
        print("[NotifyListener] Listening for db events...")
        while True:
            await asyncio.sleep(1)

def on_notification(connection, pid, channel, payload):
    data = json.loads(payload)
    print(f"[NotifyListener] New Incident: {data.get('id')} - {data.get('category')}")

def on_women_safety_alert(connection, pid, channel, payload):
    data = json.loads(payload)
    print(f"[NotifyListener] WOMEN SAFETY ALERT: {data.get('id')}")

if __name__ == "__main__":
    asyncio.run(listen_for_incidents())
