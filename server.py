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

# ======================================================
# NEW ADMIN DASHBOARD ENDPOINTS (ADDED ONLY)
# ======================================================

admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])

# -------- USERS --------

@admin_router.get("/users")
async def list_users():
    return await db.admin_users.find().to_list(1000)

@admin_router.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await db.admin_users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "User not found")
    return user

@admin_router.patch("/users/{user_id}")
async def update_user(user_id: str, payload: dict):
    await db.admin_users.update_one({"id": user_id}, {"$set": payload})
    return {"status": "updated"}

@admin_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    await db.admin_users.delete_one({"id": user_id})
    return {"status": "deleted"}

# -------- PROJECTS --------

@admin_router.post("/projects")
async def create_project(project: ProjectCreate):
    ensure_desci_address(project.desci_token_address)
    doc = project.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "status": "draft",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })
    await db.projects.insert_one(doc)
    return doc

@admin_router.patch("/projects/{project_id}")
async def update_project(project_id: str, payload: dict):
    payload["updated_at"] = datetime.now(timezone.utc)
    await db.projects.update_one({"id": project_id}, {"$set": payload})
    return {"status": "updated"}

@admin_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    await db.projects.delete_one({"id": project_id})
    return {"status": "deleted"}

# -------- PRODUCTS --------

@admin_router.get("/products")
async def list_products():
    return await db.products.find().to_list(1000)

@admin_router.post("/products")
async def create_product(payload: dict):
    payload["id"] = str(uuid.uuid4())
    await db.products.insert_one(payload)
    return payload

@admin_router.put("/products/{product_id}")
async def update_product(product_id: str, payload: dict):
    await db.products.update_one({"id": product_id}, {"$set": payload})
    return {"status": "updated"}

@admin_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    await db.products.delete_one({"id": product_id})
    return {"status": "deleted"}

# -------- ORDERS --------

@admin_router.get("/orders")
async def list_orders():
    return await db.orders.find().to_list(1000)

@admin_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    return order

@admin_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: dict):
    await db.orders.update_one({"id": order_id}, {"$set": status})
    return {"status": "updated"}

# -------- TRANSACTIONS --------

@admin_router.get("/transactions")
async def list_transactions():
    return await db.transactions.find().to_list(2000)

# -------- SITE CONFIG --------

@admin_router.get("/config")
async def get_site_config():
    return await db.site_config.find_one({}) or {}

@admin_router.put("/config")
async def update_site_config(payload: dict):
    await db.site_config.update_one({}, {"$set": payload}, upsert=True)
    return {"status": "updated"}

# -------- SLIDESHOW --------

@app.post("/api/slideshow/slides")
async def create_slide(payload: dict):
    payload["id"] = str(uuid.uuid4())
    await db.slides.insert_one(payload)
    return payload

@app.put("/api/slideshow/slides/{slide_id}")
async def update_slide(slide_id: str, payload: dict):
    await db.slides.update_one({"id": slide_id}, {"$set": payload})
    return {"status": "updated"}

@app.delete("/api/slideshow/slides/{slide_id}")
async def delete_slide(slide_id: str):
    await db.slides.delete_one({"id": slide_id})
    return {"status": "deleted"}

# ----------------------
# Register Admin Router
# ----------------------

app.include_router(admin_router)

# ----------------------
# Shutdown
# ----------------------

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
