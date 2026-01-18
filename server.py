from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Routers
from backend.auth.router import router as auth_router
from backend.launchpad.router import router as launchpad_router
from backend.slideshow.router import router as slideshow_router

import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Literal, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext

# ----------------------
# Logging
# ----------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ----------------------
# Environment
# ----------------------

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ----------------------
# MongoDB
# ----------------------

MONGO_URI = os.environ.get("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable not set")

client = AsyncIOMotorClient(MONGO_URI)
db = client.desci_launchpad

# ----------------------
# App
# ----------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------
# API Routers
# ----------------------

app.include_router(auth_router, prefix="/api")
app.include_router(launchpad_router, prefix="/api")
app.include_router(slideshow_router, prefix="/api")


# ----------------------
# Base Route
# ----------------------

@app.get("/")
async def root():
    return {"status": "ok"}

# ----------------------
# Constants
# ----------------------

DESCI_TOKEN_ADDRESS = (
    "0x1d022d585ea528404d2ea250b01098ed62348c0a52bf934d797cec374261d7d::desci::DESCI"
)

# ----------------------
# Password / Hashing
# ----------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# ----------------------
# Business Helpers
# ----------------------

def ensure_desci_address(address: str) -> None:
    if address.strip() != DESCI_TOKEN_ADDRESS:
        raise HTTPException(
            status_code=400,
            detail="desci_token_address must be the official DESCI token.",
        )

# ----------------------
# Models
# ----------------------

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class StakeRequest(BaseModel):
    amount: int
    coin_id: str

class UnstakeRequest(BaseModel):
    position_id: str
    amount: int

class ClaimRequest(BaseModel):
    position_id: str

class ProjectBase(BaseModel):
    name: str = Field(min_length=3, max_length=80)
    short_symbol: str = Field(min_length=2, max_length=10)
    description: str = Field(min_length=10, max_length=2000)

    project_type: Optional[str] = None
    logo_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    card_image_url: Optional[str] = None
    website_url: Optional[str] = None
    twitter_url: Optional[str] = None
    discord_url: Optional[str] = None
    telegram_url: Optional[str] = None

    desci_token_address: str
    project_token_address: Optional[str] = None
    sui_raise_address: Optional[str] = None

    raise_currency: str = "SUI"
    soft_cap: float = Field(gt=0)
    hard_cap: float = Field(gt=0)
    min_contribution: float = Field(gt=0)
    max_contribution: float = Field(gt=0)
    price_per_token: float = Field(gt=0)

    owner_email: Optional[str] = None
    owner_name: Optional[str] = None

    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str
    status: Literal["draft", "pending_review", "approved", "rejected", "live", "completed"]
    created_at: datetime
    updated_at: datetime

    listing_fee_tx_digest: Optional[str] = None
    listing_fee_paid_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ProjectStatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "live", "completed"]

class AdminUser(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    password_hash: Optional[str] = None
    provider: Literal["password", "google"] = "password"
    is_active: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAdminLogin(BaseModel):
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ListingFeeRecord(BaseModel):
    tx_digest: str

# ----------------------
# DB Helpers
# ----------------------

async def get_projects_collection():
    return db.projects

async def get_admins_collection():
    return db.admin_users

# ----------------------
# Shutdown
# ----------------------

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
