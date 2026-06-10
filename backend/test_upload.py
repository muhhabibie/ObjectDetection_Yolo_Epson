import asyncio
import sys
import httpx

async def test():
    # Login
    async with httpx.AsyncClient() as client:
        # 1. Login
        login_res = await client.post("http://localhost:8000/api/login", json={
            "email": "qcepson",
            "password": "qcepson123"
        })
        if login_res.status_code != 200:
            print("Login failed:", login_res.text)
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in successfully. Token obtained.")

        # 2. Upload Camera Image
        files = {"file": ("111.jpeg", open("../111.jpeg", "rb"), "image/jpeg")}
        data = {"part_name": "Gear Roller", "expected_qty": 12}
        
        print("Uploading image...")
        upload_res = await client.post(
            "http://localhost:8000/api/upload-camera/",
            headers=headers,
            files=files,
            data=data,
            timeout=30.0
        )
        print("Upload Status:", upload_res.status_code)
        print("Upload Response:", upload_res.text)

        # 3. Get Audit Logs
        logs_res = await client.get(
            "http://localhost:8000/api/audit-logs",
            headers=headers
        )
        print("\n--- Current Audit Logs from API ---")
        for log in logs_res.json():
            print(f"ID: {log['id']}, Action: {log['action']}, Details: {log['details']}")

if __name__ == "__main__":
    asyncio.run(test())
