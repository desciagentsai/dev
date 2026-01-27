from datetime import datetime
from enum import Enum
from typing import Optional, List, Any, Dict, Union, Generic, TypeVar
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
import uuid


# Enums
class UserRole(str, Enum):
    user = "user"
    project_owner = "project_owner"
    super_admin = "super_admin"

class UserStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    banned = "banned"

class ProjectStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    pre_launch = "pre-launch"
    live = "live"
    completed = "completed"
    rejected = "rejected"

class ProductType(str, Enum):
    physical = "physical"
    digital = "digital"
    token = "token"
    nft = "nft"

class ProductStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"

class OrderStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"

# Admin Authentication Models
class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: Optional[str] = None
    password_hash: str
    role: str = "admin"  # admin, super_admin
    status: str = "active"  # active, inactive
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AdminUserCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    password: str
    role: str = "admin"

class AdminUserResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    updated_at: datetime

class AdminLoginResponse(BaseModel):
    token: str
    admin: AdminUserResponse

# User Models
class WalletAddresses(BaseModel):
    sui: Optional[str] = None
    eth: Optional[str] = None

class UserProfile(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None

class ShippingAddress(BaseModel):
    id: str
    is_default: bool = False
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    phone: str

class NotificationPreferences(BaseModel):
    email_marketing: bool = True
    project_updates: bool = True
    order_updates: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    role: UserRole = UserRole.user
    wallet_addresses: Optional[WalletAddresses] = None
    profile: Optional[UserProfile] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    wallet_addresses: Optional[WalletAddresses] = None
    profile: Optional[UserProfile] = None
    shipping_addresses: Optional[List[ShippingAddress]] = None
    notification_preferences: Optional[NotificationPreferences] = None
    status: Optional[UserStatus] = None

class User(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    username: str
    role: UserRole
    wallet_addresses: Optional[WalletAddresses] = None
    profile: Optional[UserProfile] = None
    shipping_addresses: List[ShippingAddress] = []
    projects_owned: List[str] = []
    kyc_verified: bool = False
    email_verified: bool = False
    notification_preferences: NotificationPreferences = NotificationPreferences()
    total_spent: float = 0
    total_staked: float = 0
    loyalty_points: int = 0
    status: UserStatus = UserStatus.active
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True

# Product Models
class ProductImage(BaseModel):
    url: str
    alt: str
    is_primary: bool = False

class ProductInventory(BaseModel):
    track_inventory: bool = True
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = 10
    allow_backorder: bool = False
    stock_status: str = "in_stock"

class ProductDimensions(BaseModel):
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None

class PhysicalAttributes(BaseModel):
    weight: Optional[float] = None
    dimensions: Optional[ProductDimensions] = None
    requires_shipping: bool = False
    shipping_class: Optional[str] = "standard"

class DigitalAttributes(BaseModel):
    file_url: str
    file_type: str
    file_size: int
    download_limit: int = 5
    download_expiry_days: int = 30

class TokenAttributes(BaseModel):
    token_symbol: str
    token_address_sui: Optional[str] = None
    blockchain: str
    contract_address: str
    min_purchase: Optional[int] = None
    max_purchase: Optional[int] = None

class ProductVariant(BaseModel):
    id: str
    name: str
    sku: str
    attributes: Dict[str, str]
    price: float
    stock_quantity: Optional[int] = None

class ProductSEO(BaseModel):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: List[str] = []

class ProductCreate(BaseModel):
    sku: str
    name: str
    slug: str
    product_type: ProductType
    description: str
    short_description: Optional[str] = None
    price: float
    currency: str = "USD"
    crypto_price: Optional[Dict[str, float]] = None
    images: List[ProductImage] = []
    categories: List[str] = []
    tags: List[str] = []
    inventory: ProductInventory
    physical_attributes: Optional[PhysicalAttributes] = None
    digital_attributes: Optional[DigitalAttributes] = None
    token_attributes: Optional[TokenAttributes] = None
    variants: List[ProductVariant] = []
    related_project_id: Optional[str] = None
    featured: bool = False
    status: ProductStatus = ProductStatus.draft
    seo: Optional[ProductSEO] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    crypto_price: Optional[Dict[str, float]] = None
    images: Optional[List[ProductImage]] = None
    categories: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    inventory: Optional[ProductInventory] = None
    featured: Optional[bool] = None
    status: Optional[ProductStatus] = None

class Product(BaseModel):
    id: str = Field(alias="_id")
    sku: str
    name: str
    slug: str
    product_type: ProductType
    description: str
    price: float
    currency: str
    images: List[ProductImage]
    categories: List[str]
    tags: List[str]
    inventory: ProductInventory
    status: ProductStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    product_type: str
    sku: str
    variant_id: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    currency: str

class OrderPricing(BaseModel):
    subtotal: float
    shipping_cost: float = 0
    tax: float = 0
    discount: float = 0
    total: float
    currency: str

class CryptoDetails(BaseModel):
    blockchain: str
    token: str
    wallet_address: str
    amount: float
    tx_hash: str

class OrderPayment(BaseModel):
    method: str
    status: str
    transaction_id: str
    crypto_details: Optional[CryptoDetails] = None
    paid_at: Optional[datetime] = None

class OrderShipping(BaseModel):
    method: str
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_date: Optional[datetime] = None
    estimated_delivery: Optional[datetime] = None

class OrderHistoryEntry(BaseModel):
    status: str
    timestamp: datetime
    note: str

class OrderCreate(BaseModel):
    user_id: str
    items: List[OrderItem]
    pricing: OrderPricing
    payment: OrderPayment
    shipping_address: ShippingAddress
    shipping: Optional[OrderShipping] = None
    customer_notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    shipping: Optional[OrderShipping] = None
    admin_notes: Optional[str] = None

class Order(BaseModel):
    id: str = Field(alias="_id")
    order_number: str
    user_id: str
    status: OrderStatus
    order_type: str
    items: List[OrderItem]
    pricing: OrderPricing
    payment: OrderPayment
    shipping_address: ShippingAddress
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True

# Project Models
class ProjectCreate(BaseModel):
    project_name: str
    token_symbol: str
    description: str
    project_type: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    hero_image_url: Optional[str] = None
    card_image_url: Optional[str] = None
    twitter: Optional[str] = None
    discord: Optional[str] = None
    telegram: Optional[str] = None
    token_address_sui: Optional[str] = None
    raise_object_address: Optional[str] = None
    raise_currency: str = "SUI"
    soft_cap: float
    hard_cap: float
    min_contribution: float
    max_contribution: float
    price_per_token: float
    team_name: str
    contact_email: EmailStr
    owner_user_id: str
    whitepaper_url: Optional[str] = None
    pitch_deck_url: Optional[str] = None
    video_url: Optional[str] = None
    tags: List[str] = []

class ProjectUpdate(BaseModel):
    status: Optional[ProjectStatus] = None
    description: Optional[str] = None
    soft_cap: Optional[float] = None
    hard_cap: Optional[float] = None
    featured: Optional[bool] = None
    trending: Optional[bool] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None

class Project(BaseModel):
    id: str = Field(alias="_id")
    project_name: str
    token_symbol: str
    description: str
    status: ProjectStatus
    owner_user_id: str
    total_raised: float = 0
    total_contributors: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True

# Simple response models
class MessageResponse(BaseModel):
    message: str
    id: Optional[str] = None

class StatsResponse(BaseModel):
    total: int
    collection: str

# Pagination
T = TypeVar("T")

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    limit: int
    pages: int

# Site Configuration
class SiteConfig(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    site_name: str
    contact_email: Optional[str] = None
    maintenance_mode: bool = False
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class SiteConfigCreate(BaseModel):
    site_name: str
    contact_email: Optional[str] = None
    maintenance_mode: bool = False


# Slideshow Models
class SlideshowSlideCreate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: Optional[str] = None
    image_url: str
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    order: int = 0
    active: bool = True

class SlideshowSlide(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: Optional[str] = None
    image_url: str
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    order: int = 0
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Category Models
class CategoryCreate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    icon_url: Optional[str] = None
    order: int = 0
    active: bool = True

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    icon_url: Optional[str] = None
    order: int = 0
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
