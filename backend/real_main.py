import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import models
from database import engine, get_db
import hmac
import hashlib
import base64
import json
import time
import datetime

app = FastAPI(
    title="Sportix E-Commerce API",
    description="Backend API for Sportix Sports Shop with product catalogs and ordering",
    version="1.0.0"
)

import os
from database import engine, SessionLocal
import init_db

# Automatically initialize tables (especially needed for Vercel /tmp SQLite)
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database table creation failed: {e}")

# Try to seed initial data if empty
db = SessionLocal()
try:
    init_db.seed_products(db)
    init_db.seed_default_user(db)
except Exception as e:
    print(f"Startup DB seeding failed: {e}")
finally:
    db.close()
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is fully operational", "timestamp": datetime.datetime.utcnow().isoformat()}

# Configure CORS so the frontend can easily communicate with it locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Security Config
SECRET_KEY = "sportix_super_secret_key"
SALT = b"sportix_salt_value"

def hash_password(password: str) -> str:
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), SALT, 100000)
    return pwd_hash.hex()

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str) -> dict:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
        expected_sig_b64 = base64url_encode(expected_signature)
        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        if "exp" in payload and payload["exp"] < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None), token: Optional[str] = None, db: Session = Depends(get_db)) -> models.User:
    token_str = None
    if authorization and authorization.startswith("Bearer "):
        token_str = authorization.split(" ")[1]
    elif token:
        if token.startswith("Bearer "):
            token_str = token.split(" ")[1]
        else:
            token_str = token
            
    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or malformed"
        )
    payload = decode_jwt(token_str)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )
    user_id = payload.get("user_id")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

def get_current_user_optional(authorization: Optional[str] = Header(None), token: Optional[str] = None, db: Session = Depends(get_db)) -> Optional[models.User]:
    token_str = None
    if authorization and authorization.startswith("Bearer "):
        token_str = authorization.split(" ")[1]
    elif token:
        if token.startswith("Bearer "):
            token_str = token.split(" ")[1]
        else:
            token_str = token
            
    if not token_str:
        return None
    payload = decode_jwt(token_str)
    if not payload:
        return None
    user_id = payload.get("user_id")
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_current_admin_user(user: models.User = Depends(get_current_user)) -> models.User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin privileges"
        )
    return user

# Pydantic Schemas for validation
class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    category: str
    rating: float
    image_url: Optional[str] = None
    sizes: Optional[str] = None
    colors: Optional[str] = None
    stock: int
    class Config:
        from_attributes = True

class CartItemInput(BaseModel):
    product_id: int
    quantity: int

class CheckoutInput(BaseModel):
    customer_name: str
    email: EmailStr
    address: str
    items: List[CartItemInput]
    payment_method: Optional[str] = "Credit Card"
    card_number: Optional[str] = None
    coupon_code: Optional[str] = None

class CouponInput(BaseModel):
    code: str
    discount_percentage: float

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    customer_name: str
    email: str
    address: str
    total_price: float
    created_at: str
    class Config:
        from_attributes = True

class ReviewInput(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    user_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: str
    class Config:
        from_attributes = True

class OrderEventInput(BaseModel):
    status: str
    description: Optional[str] = None

class OrderEventResponse(BaseModel):
    id: int
    status: str
    description: Optional[str] = None
    created_at: str
    class Config:
        from_attributes = True

class ProductInput(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str
    image_url: Optional[str] = None
    sizes: Optional[str] = None
    colors: Optional[str] = None
    stock: int

# Auth Schemas
class RegisterInput(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdateInput(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None

class ChangePasswordInput(BaseModel):
    old_password: str
    new_password: str

# Address Schemas
class AddressInput(BaseModel):
    label: str
    full_name: str
    address_line: str
    city: str
    state: str
    zip_code: str
    country: Optional[str] = "United States"
    is_default: Optional[bool] = False

class AddressResponse(BaseModel):
    id: int
    label: str
    full_name: str
    address_line: str
    city: str
    state: str
    zip_code: str
    country: str
    is_default: bool
    class Config:
        from_attributes = True

# Preferences Schema
class PreferenceInput(BaseModel):
    theme: str
    notify_orders: bool
    notify_offers: bool

class PreferenceResponse(BaseModel):
    theme: str
    notify_orders: bool
    notify_offers: bool
    class Config:
        from_attributes = True
@app.get("/")
def read_root():
    return {
        "message": "Welcome to Sportix API",
        "docs": "/docs",
        "status": "healthy"
    }
@app.get("/api/products", response_model=List[ProductResponse])
def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = None,  # price_asc, price_desc, rating_desc
    db: Session = Depends(get_db)
):
    query = db.query(models.Product)
    # Filtering by category
    if category and category.lower() != "all":
        query = query.filter(models.Product.category == category)
    # Search filter (name or description)
    if search:
        query = query.filter(
            (models.Product.name.ilike(f"%{search}%")) |
            (models.Product.description.ilike(f"%{search}%"))
        )
    # Price range filters
    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)
    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(models.Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Product.price.desc())
    elif sort_by == "rating_desc":
        query = query.order_by(models.Product.rating.desc())
    else:
        # Default sort
        query = query.order_by(models.Product.id.asc())
    return query.all()
@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found"
        )
    return product
@app.post("/api/checkout", status_code=status.HTTP_201_CREATED)
def checkout(order_data: CheckoutInput, db: Session = Depends(get_db), user: Optional[models.User] = Depends(get_current_user_optional)):
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart cannot be empty for checkout"
        )
    # Verify products and calculate total price
    total_price = 0.0
    subtotal = 0.0
    items_to_create = []
    for item in order_data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {item.product_id} not found"
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for product '{product.name}'. Available: {product.stock}, Requested: {item.quantity}"
            )
        # Deduct stock
        product.stock -= item.quantity
        
        item_total = product.price * item.quantity
        subtotal += item_total
        total_price += item_total
        
        # Prepare OrderItem
        order_item = models.OrderItem(
            product_id=product.id,
            quantity=item.quantity,
            price=product.price
        )
        items_to_create.append(order_item)
    
    # Last 4 card digits logic
    card_last4 = None
    if order_data.card_number:
        clean_card = "".join(filter(str.isdigit, order_data.card_number))
        if len(clean_card) >= 4:
            card_last4 = clean_card[-4:]
        else:
            card_last4 = clean_card
            
    discount_amount = 0.0
    if order_data.coupon_code:
        coupon = db.query(models.Coupon).filter(models.Coupon.code == order_data.coupon_code, models.Coupon.is_active == True).first()
        if coupon:
            discount_amount = (subtotal * coupon.discount_percentage) / 100
            total_price -= discount_amount
            
    # Create the Order
    new_order = models.Order(
        customer_name=order_data.customer_name,
        email=order_data.email,
        address=order_data.address,
        total_price=round(total_price, 2),
        subtotal=round(subtotal, 2),
        discount_amount=round(discount_amount, 2),
        coupon_code=order_data.coupon_code,
        items=items_to_create,
        user_id=user.id if user else None,
        payment_method=order_data.payment_method or "Credit Card",
        payment_status="Paid",
        order_status="Pending",
        card_last4=card_last4
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    # Create order notification if user is logged in
    if user:
        notif = models.Notification(
            user_id=user.id,
            title="Order Placed Successfully",
            message=f"Thank you! Your order #{new_order.id} for ${new_order.total_price:.2f} has been placed. We are preparing it for packaging."
        )
        db.add(notif)
        db.commit()
        
    return {
        "success": True,
        "message": "Order placed successfully",
        "order_id": new_order.id,
        "total_price": new_order.total_price,
        "created_at": new_order.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

# ========================================
# USER AUTHENTICATION ENDPOINTS
# ========================================

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(user_data: RegisterInput, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
    
    new_user = models.User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        phone_number=user_data.phone_number,
        profile_picture="assets/images/user_avatar.png"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    pref = models.UserPreference(
        user_id=new_user.id,
        theme="dark",
        notify_orders=True,
        notify_offers=False
    )
    db.add(pref)
    db.commit()
    
    welcome_notif = models.Notification(
        user_id=new_user.id,
        title="Welcome to Sportix!",
        message="Thank you for joining Sportix! Gear up and elevate your game to the apex."
    )
    db.add(welcome_notif)
    db.commit()
    
    token = create_jwt({
        "user_id": new_user.id,
        "email": new_user.email,
        "exp": time.time() + 86400 * 7
    })
    
    return {
        "success": True,
        "message": "User registered successfully",
        "token": token,
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "phone_number": new_user.phone_number,
            "profile_picture": new_user.profile_picture,
            "member_since": new_user.member_since.strftime("%Y-%m-%d")
        }
    }

@app.post("/api/auth/login")
def login(credentials: LoginInput, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or user.password_hash != hash_password(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_jwt({
        "user_id": user.id,
        "email": user.email,
        "exp": time.time() + 86400 * 7
    })
    
    return {
        "success": True,
        "message": "Logged in successfully",
        "token": token,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "profile_picture": user.profile_picture,
            "member_since": user.member_since.strftime("%Y-%m-%d")
        }
    }

@app.get("/api/auth/me")
def get_me(user: models.User = Depends(get_current_user)):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "profile_picture": user.profile_picture,
        "member_since": user.member_since.strftime("%Y-%m-%d")
    }

@app.put("/api/auth/profile")
def update_profile(profile_data: ProfileUpdateInput, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if profile_data.email != user.email:
        existing = db.query(models.User).filter(models.User.email == profile_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already in use by another user"
            )
        user.email = profile_data.email
        
    user.full_name = profile_data.full_name
    user.phone_number = profile_data.phone_number
    if profile_data.profile_picture:
        user.profile_picture = profile_data.profile_picture
        
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "profile_picture": user.profile_picture,
            "member_since": user.member_since.strftime("%Y-%m-%d")
        }
    }

@app.put("/api/auth/change-password")
def change_password(data: ChangePasswordInput, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.password_hash != hash_password(data.old_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"success": True, "message": "Password changed successfully"}

@app.get("/api/auth/sessions")
def get_sessions(user: models.User = Depends(get_current_user)):
    return {
        "active_sessions": [
            {
                "id": 1,
                "device": "Windows PC - Chrome Browser",
                "ip": "127.0.0.1 (Current Session)",
                "location": "Local Host",
                "last_active": "Active Now"
            },
            {
                "id": 2,
                "device": "iPhone 15 - Safari Mobile",
                "ip": "192.168.1.45",
                "location": "Home Network",
                "last_active": "2 hours ago"
            }
        ],
        "login_activity": [
            {"date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "device": "Chrome (Windows)", "status": "Success"},
            {"date": (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"), "device": "Chrome (Windows)", "status": "Success"},
            {"date": (datetime.datetime.now() - datetime.timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"), "device": "Safari (iOS)", "status": "Success"}
        ]
    }

# ========================================
# WISHLIST ENDPOINTS
# ========================================

@app.get("/api/wishlist")
def get_wishlist(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    wishlist_items = db.query(models.WishlistItem).filter(models.WishlistItem.user_id == user.id).all()
    result = []
    for item in wishlist_items:
        prod = item.product
        if prod:
            result.append({
                "product_id": prod.id,
                "name": prod.name,
                "price": prod.price,
                "image_url": prod.image_url,
                "category": prod.category,
                "rating": prod.rating,
                "stock": prod.stock
            })
    return result

@app.post("/api/wishlist/{product_id}")
def add_to_wishlist(product_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    existing = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == user.id,
        models.WishlistItem.product_id == product_id
    ).first()
    if existing:
        return {"success": True, "message": "Product already in wishlist"}
        
    new_item = models.WishlistItem(user_id=user.id, product_id=product_id)
    db.add(new_item)
    db.commit()
    return {"success": True, "message": "Product added to wishlist"}

@app.delete("/api/wishlist/{product_id}")
def remove_from_wishlist(product_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == user.id,
        models.WishlistItem.product_id == product_id
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found in wishlist"
        )
    db.delete(item)
    db.commit()
    return {"success": True, "message": "Product removed from wishlist"}

# ========================================
# ADDRESS BOOK ENDPOINTS
# ========================================

@app.get("/api/addresses", response_model=List[AddressResponse])
def get_addresses(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.UserAddress).filter(models.UserAddress.user_id == user.id).all()

@app.post("/api/addresses", response_model=AddressResponse)
def add_address(address_data: AddressInput, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if address_data.is_default:
        db.query(models.UserAddress).filter(models.UserAddress.user_id == user.id).update({"is_default": False})
        
    addr_count = db.query(models.UserAddress).filter(models.UserAddress.user_id == user.id).count()
    is_default = address_data.is_default if addr_count > 0 else True
    
    new_address = models.UserAddress(
        user_id=user.id,
        label=address_data.label,
        full_name=address_data.full_name,
        address_line=address_data.address_line,
        city=address_data.city,
        state=address_data.state,
        zip_code=address_data.zip_code,
        country=address_data.country or "United States",
        is_default=is_default
    )
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    return new_address

@app.put("/api/addresses/{address_id}", response_model=AddressResponse)
def edit_address(address_id: int, address_data: AddressInput, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(models.UserAddress).filter(
        models.UserAddress.id == address_id,
        models.UserAddress.user_id == user.id
    ).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
        
    if address_data.is_default and not addr.is_default:
        db.query(models.UserAddress).filter(models.UserAddress.user_id == user.id).update({"is_default": False})
        addr.is_default = True
    elif not address_data.is_default and addr.is_default:
        # Prevent setting default address to False if it's the only one
        addr_count = db.query(models.UserAddress).filter(models.UserAddress.user_id == user.id).count()
        if addr_count > 1:
            addr.is_default = False
        
    addr.label = address_data.label
    addr.full_name = address_data.full_name
    addr.address_line = address_data.address_line
    addr.city = address_data.city
    addr.state = address_data.state
    addr.zip_code = address_data.zip_code
    addr.country = address_data.country or "United States"
    
    db.commit()
    db.refresh(addr)
    return addr

@app.delete("/api/addresses/{address_id}")
def delete_address(address_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(models.UserAddress).filter(
        models.UserAddress.id == address_id,
        models.UserAddress.user_id == user.id
    ).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
        
    is_deleted_default = addr.is_default
    db.delete(addr)
    db.commit()
    
    if is_deleted_default:
        another = db.query(models.UserAddress).filter(models.UserAddress.user_id == user.id).first()
        if another:
            another.is_default = True
            db.commit()
            
    return {"success": True, "message": "Address deleted successfully"}

@app.post("/api/addresses/{address_id}/default")
def set_default_address(address_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    addr = db.query(models.UserAddress).filter(
        models.UserAddress.id == address_id,
        models.UserAddress.user_id == user.id
    ).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
        
    db.query(models.UserAddress).filter(models.UserAddress.user_id == user.id).update({"is_default": False})
    addr.is_default = True
    db.commit()
    return {"success": True, "message": "Address set as default successfully"}

# ========================================
# PREFERENCES ENDPOINTS
# ========================================

@app.get("/api/preferences", response_model=PreferenceResponse)
def get_preferences(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = db.query(models.UserPreference).filter(models.UserPreference.user_id == user.id).first()
    if not pref:
        pref = models.UserPreference(user_id=user.id, theme="dark", notify_orders=True, notify_offers=False)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref

@app.put("/api/preferences", response_model=PreferenceResponse)
def update_preferences(pref_data: PreferenceInput, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = db.query(models.UserPreference).filter(models.UserPreference.user_id == user.id).first()
    if not pref:
        pref = models.UserPreference(user_id=user.id)
        db.add(pref)
        
    pref.theme = pref_data.theme
    pref.notify_orders = pref_data.notify_orders
    pref.notify_offers = pref_data.notify_offers
    db.commit()
    db.refresh(pref)
    return pref

# ========================================
# ORDER MANAGEMENT ENDPOINTS
# ========================================

@app.get("/api/orders")
def get_orders(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == user.id).order_by(models.Order.created_at.desc()).all()
    result = []
    for order in orders:
        items = []
        for item in order.items:
            prod = item.product
            items.append({
                "product_id": item.product_id,
                "name": prod.name if prod else "Unknown Product",
                "image_url": prod.image_url if prod else "assets/images/placeholder.png",
                "quantity": item.quantity,
                "price": item.price
            })
        result.append({
            "order_id": order.id,
            "customer_name": order.customer_name,
            "email": order.email,
            "address": order.address,
            "total_price": order.total_price,
            "created_at": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "order_status": order.order_status,
            "card_last4": order.card_last4,
            "items": items
        })
    return result

@app.get("/api/orders/{order_id}")
def get_order_details(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    items = []
    for item in order.items:
        prod = item.product
        items.append({
            "product_id": item.product_id,
            "name": prod.name if prod else "Unknown Product",
            "image_url": prod.image_url if prod else "assets/images/placeholder.png",
            "quantity": item.quantity,
            "price": item.price
        })
        
    return {
        "order_id": order.id,
        "customer_name": order.customer_name,
        "email": order.email,
        "address": order.address,
        "total_price": order.total_price,
        "created_at": order.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "order_status": order.order_status,
        "card_last4": order.card_last4,
        "items": items
    }

@app.post("/api/orders/{order_id}/cancel")
def cancel_order(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.order_status not in ["Pending", "Processing"]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be cancelled because it is already {order.order_status}"
        )
        
    order.order_status = "Cancelled"
    order.payment_status = "Refunded"
    
    for item in order.items:
        prod = item.product
        if prod:
            prod.stock += item.quantity
            
    db.commit()
    
    notif = models.Notification(
        user_id=user.id,
        title="Order Cancelled",
        message=f"Your order #{order.id} has been cancelled successfully. Refund is being processed."
    )
    db.add(notif)
    db.commit()
    
    return {"success": True, "message": "Order cancelled successfully, stock restored"}

@app.get("/api/orders/{order_id}/track")
def track_order(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    status_steps = ["Pending", "Processing", "Shipped", "Out For Delivery", "Delivered"]
    current_status = order.order_status
    
    if current_status == "Cancelled":
        events = [
            {"status": "Pending", "completed": True, "time": order.created_at.strftime("%Y-%m-%d %H:%M:%S"), "desc": "Order placed successfully"},
            {"status": "Cancelled", "completed": True, "time": "Just now", "desc": "Order cancelled by user"}
        ]
    else:
        events = []
        base_time = order.created_at
        
        for step in status_steps:
            if current_status == "Pending" and step != "Pending":
                completed = False
                event_time = "-"
                desc = f"Awaiting {step.lower()} details"
            elif current_status == "Processing" and step not in ["Pending", "Processing"]:
                completed = False
                event_time = "-"
                desc = f"Awaiting {step.lower()} details"
            elif current_status == "Shipped" and step in ["Out For Delivery", "Delivered"]:
                completed = False
                event_time = "-"
                desc = f"Awaiting {step.lower()} details"
            elif current_status == "Out For Delivery" and step == "Delivered":
                completed = False
                event_time = "-"
                desc = f"Awaiting {step.lower()} details"
            else:
                completed = True
                if step == "Pending":
                    event_time = base_time.strftime("%Y-%m-%d %H:%M:%S")
                    desc = "Order placed and payment received"
                elif step == "Processing":
                    event_time = (base_time + datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
                    desc = "Order checked, items packed and ready for dispatch"
                elif step == "Shipped":
                    event_time = (base_time + datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
                    desc = "Package picked up by logistics carrier"
                elif step == "Out For Delivery":
                    event_time = (base_time + datetime.timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
                    desc = "Out for delivery with carrier agent"
                elif step == "Delivered":
                    event_time = (base_time + datetime.timedelta(days=2, hours=4)).strftime("%Y-%m-%d %H:%M:%S")
                    desc = "Package delivered and signed by customer"
            
            events.append({
                "status": step,
                "completed": completed,
                "time": event_time,
                "desc": desc
            })
            
    return {
        "order_id": order.id,
        "current_status": current_status,
        "events": events
    }


# ========================================
# NOTIFICATION ENDPOINTS
# ========================================

@app.get("/api/notifications")
def get_notifications(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    ).order_by(models.Notification.created_at.desc()).limit(20).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for n in notifs
    ]

@app.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"success": True, "message": "Notification marked as read"}

@app.post("/api/notifications/mark-all-read")
def mark_all_read(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(
        models.Notification.user_id == user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"success": True, "message": "All notifications marked as read"}

# ========================================
# ========================================
# ADMIN ENDPOINTS
# ========================================

@app.get("/api/admin/dashboard")
def admin_get_dashboard(admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    total_products = db.query(models.Product).count()
    total_orders = db.query(models.Order).count()
    total_users = db.query(models.User).filter(models.User.is_admin == False).count()
    
    orders = db.query(models.Order).all()
    total_revenue = sum([o.total_price for o in orders if o.payment_status == "Paid"])
    pending_orders = len([o for o in orders if o.order_status == "Pending"])
    delivered_orders = len([o for o in orders if o.order_status == "Delivered"])
    
    # Recent Activities (e.g., 5 most recent orders)
    recent_orders = sorted(orders, key=lambda x: x.created_at, reverse=True)[:5]
    activities = [{"message": f"New order #{o.id} placed by {o.customer_name} for ${o.total_price}", "time": o.created_at.strftime("%Y-%m-%d %H:%M")} for o in recent_orders]
    
    return {
        "metrics": {
            "total_products": total_products,
            "total_orders": total_orders,
            "total_users": total_users,
            "total_revenue": round(total_revenue, 2),
            "pending_orders": pending_orders,
            "delivered_orders": delivered_orders
        },
        "recent_activities": activities
    }


@app.get("/api/admin/users")
def admin_get_users(admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "is_admin": u.is_admin, "member_since": u.member_since.strftime("%Y-%m-%d")} for u in users]

@app.get("/api/admin/orders")
def admin_get_orders(admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    return [{
        "order_id": o.id,
        "customer_name": o.customer_name,
        "email": o.email,
        "total_price": o.total_price,
        "order_status": o.order_status,
        "created_at": o.created_at.strftime("%Y-%m-%d %H:%M:%S")
    } for o in orders]

@app.put("/api/admin/orders/{order_id}")
def admin_update_order(order_id: int, status_update: dict, admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    new_status = status_update.get("order_status")
    if new_status:
        order.order_status = new_status
        # Add order event
        event = models.OrderEvent(order_id=order.id, status=new_status, description=f"Order status updated to {new_status}")
        db.add(event)
        
        # Notify user
        if order.user_id:
            notif = models.Notification(user_id=order.user_id, title="Order Status Update", message=f"Your order #{order.id} is now {new_status}.")
            db.add(notif)
            
        db.commit()
    return {"success": True, "message": "Order updated successfully"}

@app.post("/api/admin/products")
def admin_add_product(product: ProductInput, admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    new_product = models.Product(**product.dict())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return {"success": True, "product_id": new_product.id}

@app.put("/api/admin/products/{product_id}")
def admin_update_product(product_id: int, product_data: ProductInput, admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product_data.dict().items():
        setattr(product, key, value)
        
    db.commit()
    return {"success": True, "message": "Product updated"}

@app.delete("/api/admin/products/{product_id}")
def admin_delete_product(product_id: int, admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"success": True, "message": "Product deleted"}

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"success": True, "message": "User deleted"}

@app.get("/api/admin/reviews")
def admin_get_reviews(admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    reviews = db.query(models.Review).order_by(models.Review.created_at.desc()).all()
    return [{
        "id": r.id,
        "product_id": r.product_id,
        "user_id": r.user_id,
        "user_name": r.user.full_name if r.user else "Anonymous",
        "product_name": r.product.name if r.product else "Unknown",
        "rating": r.rating,
        "comment": r.comment,
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M")
    } for r in reviews]

@app.delete("/api/admin/reviews/{review_id}")
def admin_delete_review(review_id: int, admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"success": True, "message": "Review deleted"}

# ========================================
# REVIEW ENDPOINTS
# ========================================

@app.get("/api/products/{product_id}/reviews", response_model=List[ReviewResponse])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).order_by(models.Review.created_at.desc()).all()
    result = []
    for r in reviews:
        result.append({
            "id": r.id,
            "product_id": r.product_id,
            "user_id": r.user_id,
            "user_name": r.user.full_name if r.user else "Anonymous",
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.strftime("%Y-%m-%d")
        })
    return result

@app.post("/api/products/{product_id}/reviews")
def add_product_review(product_id: int, review: ReviewInput, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user already reviewed
    existing = db.query(models.Review).filter(models.Review.product_id == product_id, models.Review.user_id == user.id).first()
    if existing:
        existing.rating = review.rating
        existing.comment = review.comment
    else:
        new_review = models.Review(product_id=product_id, user_id=user.id, rating=review.rating, comment=review.comment)
        db.add(new_review)
        
    db.commit()
    
    # Update product average rating
    all_reviews = db.query(models.Review).filter(models.Review.product_id == product_id).all()
    avg_rating = sum(r.rating for r in all_reviews) / len(all_reviews) if all_reviews else 0.0
    product.rating = round(avg_rating, 1)
    db.commit()
    
    return {"success": True, "message": "Review added successfully"}

# ========================================
# ORDER EVENTS ENDPOINTS
# ========================================

@app.get("/api/orders/{order_id}/track")
def track_order(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this order's events")
        
    events = db.query(models.OrderEvent).filter(models.OrderEvent.order_id == order_id).order_by(models.OrderEvent.created_at.asc()).all()
    
    stages = ["Pending", "Processing", "Shipped", "Out For Delivery", "Delivered"]
    frontend_events = []
    
    if order.order_status == "Cancelled":
        frontend_events.append({"status": "Cancelled", "desc": "Order was cancelled", "time": order.created_at.strftime("%Y-%m-%d %H:%M"), "completed": True})
    else:
        for stage in stages:
            ev = next((e for e in events if e.status == stage), None)
            if ev:
                frontend_events.append({
                    "status": stage,
                    "desc": ev.description or f"Order {stage}",
                    "time": ev.created_at.strftime("%Y-%m-%d %H:%M"),
                    "completed": True
                })
            else:
                frontend_events.append({
                    "status": stage,
                    "desc": "Pending updates...",
                    "time": "--",
                    "completed": False
                })
                
    return {
        "order_id": order.id,
        "current_status": order.order_status,
        "events": frontend_events
    }

import io
from fastapi.responses import StreamingResponse

@app.get("/api/admin/coupons")
def admin_get_coupons(admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    coupons = db.query(models.Coupon).all()
    return [{"id": c.id, "code": c.code, "discount_percentage": c.discount_percentage, "is_active": c.is_active} for c in coupons]

@app.post("/api/admin/coupons")
def admin_add_coupon(coupon: CouponInput, admin: models.User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    existing = db.query(models.Coupon).filter(models.Coupon.code == coupon.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    new_coupon = models.Coupon(code=coupon.code, discount_percentage=coupon.discount_percentage)
    db.add(new_coupon)
    db.commit()
    return {"success": True, "message": "Coupon created"}

@app.post("/api/cart/apply-coupon")
def apply_coupon(coupon_data: dict, db: Session = Depends(get_db)):
    code = coupon_data.get("code")
    coupon = db.query(models.Coupon).filter(models.Coupon.code == code, models.Coupon.is_active == True).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or expired coupon code")
    return {"success": True, "discount_percentage": coupon.discount_percentage}

@app.get("/api/orders/{order_id}/invoice")
def get_order_invoice(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to download this invoice")

    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)

    # Header
    pdf.set_font("Helvetica", style="B", size=20)
    pdf.cell(200, 10, txt="SPORTIX INVOICE", ln=True, align='C')
    pdf.ln(10)

    # Order Details
    pdf.set_font("Helvetica", size=12)
    pdf.cell(100, 10, txt=f"Order ID: #{order.id}", ln=False)
    pdf.cell(100, 10, txt=f"Date: {order.created_at.strftime('%Y-%m-%d %H:%M')}", ln=True)
    pdf.cell(100, 10, txt=f"Customer Name: {order.customer_name}", ln=True)
    pdf.cell(100, 10, txt=f"Billing Address: {order.address}", ln=True)
    pdf.cell(100, 10, txt=f"Payment Method: {order.payment_method} ({order.payment_status})", ln=True)
    pdf.ln(10)

    # Table Header
    pdf.set_font("Helvetica", style="B", size=12)
    pdf.cell(90, 10, "Product", 1)
    pdf.cell(30, 10, "Qty", 1)
    pdf.cell(35, 10, "Unit Price", 1)
    pdf.cell(35, 10, "Total", 1)
    pdf.ln()

    # Table Body
    pdf.set_font("Helvetica", size=12)
    for item in order.items:
        pdf.cell(90, 10, item.product.name[:30] if item.product else f"Product {item.product_id}", 1)
        pdf.cell(30, 10, str(item.quantity), 1)
        pdf.cell(35, 10, f"${item.price:.2f}", 1)
        pdf.cell(35, 10, f"${(item.price * item.quantity):.2f}", 1)
        pdf.ln()

    # Summary
    pdf.ln(5)
    pdf.set_font("Helvetica", style="B", size=12)
    pdf.cell(150, 10, "Subtotal", 0, 0, 'R')
    pdf.cell(40, 10, f"${order.subtotal:.2f}", 0, 1, 'R')
    if order.discount_amount > 0:
        pdf.cell(150, 10, f"Discount ({order.coupon_code})", 0, 0, 'R')
        pdf.cell(40, 10, f"-${order.discount_amount:.2f}", 0, 1, 'R')
    pdf.cell(150, 10, "Total Amount", 0, 0, 'R')
    pdf.cell(40, 10, f"${order.total_price:.2f}", 0, 1, 'R')

    pdf_bytes = bytes(pdf.output())
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=invoice_{order.id}.pdf"})
