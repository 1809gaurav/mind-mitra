#!/usr/bin/env python3
"""
Create or promote a MindMitra admin user.

Usage:
    python scripts/create_admin.py --email admin@example.com --password securepass

This script runs standalone — it does NOT import any app modules, so it works
without the FastAPI server running. It reads MONGODB_URL and DATABASE_NAME from
the .env file in the project root (or from environment variables directly).

Requirements (already in requirements.txt):
    motor, passlib[bcrypt], python-dotenv
"""

import argparse
import asyncio
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Load .env from the project root (one directory above scripts/)
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "mindmitra")


async def create_or_promote_admin(email: str, password: str) -> None:
    """Insert a new admin user or promote an existing account to admin role."""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from passlib.context import CryptContext
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("    Run: pip install motor passlib[bcrypt] python-dotenv")
        sys.exit(1)

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users = db["users"]

    try:
        # Test connection
        await client.admin.command("ping")
    except Exception as e:
        print(f"[ERROR] Cannot connect to MongoDB at {MONGODB_URL}: {e}")
        client.close()
        sys.exit(1)

    now = datetime.utcnow()
    existing = await users.find_one({"email": email})

    if existing:
        await users.update_one(
            {"email": email},
            {"$set": {"role": "admin", "is_active": True, "updated_at": now}},
        )
        print(f"[OK] Promoted existing user '{email}' to role=admin.")
    else:
        hashed_password = pwd_context.hash(password)
        await users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": "Admin",
                "role": "admin",
                "hashed_password": hashed_password,
                "emergency_contacts": [],
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
        )
        print(f"[OK] Created new admin user '{email}'.")

    print(f"    Database: {MONGODB_URL}/{DATABASE_NAME}")
    client.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or promote a MindMitra admin user.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Example:\n  python scripts/create_admin.py --email admin@example.com --password s3cr3tPass",
    )
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password (minimum 8 characters)")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("❌  Password must be at least 8 characters.")
        sys.exit(1)

    asyncio.run(create_or_promote_admin(args.email, args.password))


if __name__ == "__main__":
    main()
