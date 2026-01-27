from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import os
from typing import Optional
from backend.models import AdminLogin, AdminLoginResponse, AdminUser, AdminUserResponse, AdminUserCreate
from backend.db import get_db

router = APIRouter(prefix="/admin", tags=["admin-auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

ADMIN_JWT_SECRET = os.environ.get('ADMIN_JWT_SECRET', 'changeme-jwt-secret')
ADMIN_JWT_EXPIRE_MINUTES = int(os.environ.get('ADMIN_JWT_EXPIRE_MINUTES', 1440))

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_admin_token(admin_id: str, email: str, role: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=ADMIN_JWT_EXPIRE_MINUTES)
    payload = {
        "admin_id": admin_id,
        "email": email,
        "role": role,
        "exp": expire
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        admin_id = payload.get("admin_id")
        if admin_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_super_admin(admin: dict = Depends(get_current_admin)):
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return admin

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(credentials: AdminLogin):
    db = get_db()
    admin_doc = await db.admin_users.find_one({"email": credentials.email}, {"_id": 0})
    if not admin_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, admin_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if admin_doc.get("status") != "active":
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    token = create_admin_token(admin_doc["id"], admin_doc["email"], admin_doc["role"])
    admin_response = AdminUserResponse(**admin_doc)
    
    return AdminLoginResponse(token=token, admin=admin_response)

@router.post("/seed-super-admin")
async def seed_super_admin():
    """Create initial super admin if none exists"""
    db = get_db()
    existing = await db.admin_users.find_one({"role": "super_admin"})
    if existing:
        return {"message": "Super admin already exists"}
    
    admin = AdminUser(
        email="admin@descilaunch.xyz",
        password_hash=get_password_hash("changeme123"),
        role="super_admin",
        status="active"
    )
    
    doc = admin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.admin_users.insert_one(doc)
    return {"message": "Super admin created", "email": "admin@descilaunch.xyz", "password": "changeme123"}

@router.get("/me", response_model=AdminUserResponse)
async def get_current_admin_info(admin: dict = Depends(get_current_admin)):
    db = get_db()
    admin_doc = await db.admin_users.find_one({"id": admin["admin_id"]}, {"_id": 0})
    if not admin_doc:
        raise HTTPException(status_code=404, detail="Admin not found")
    return AdminUserResponse(**admin_doc)

@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(get_current_admin)):
    # Note: Ensure fetch_admin_stats() is defined in your environment
    stats = await fetch_admin_stats()  
    return stats

# ❌ REMOVED legacy /orders endpoint
# Orders are handled by backend/admin/orders_router.py
