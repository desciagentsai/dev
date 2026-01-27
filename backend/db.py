import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "desci_launchpad")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable is required")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

def get_db():
    return db
