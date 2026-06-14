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
            
    # Create the Order
    new_order = models.Order(
        customer_name=order_data.customer_name,
        email=order_data.email,
        address=order_data.address,
        total_price=round(total_price, 2),
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

@app.get("/api/orders/{order_id}/invoice")
def get_invoice(order_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    items_html = ""
    subtotal = 0.0
    for idx, item in enumerate(order.items):
        prod = item.product
        item_total = item.price * item.quantity
        subtotal += item_total
        prod_name = prod.name if prod else 'Unknown Product'
        prod_category = prod.category if prod else 'N/A'
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">{idx + 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">
                <strong>{prod_name}</strong><br>
                <span style="font-size: 0.8rem; color: #666;">Category: {prod_category}</span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${item.price:.2f}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">{item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${item_total:.2f}</td>
        </tr>
        """
        
    tax = subtotal * 0.05
    shipping = 10.0 if subtotal < 100.0 else 0.0
    grand_total = subtotal + tax + shipping
    shipping_display = f"{shipping:.2f}" if shipping > 0 else "FREE"
    address_html = order.address.replace('\n', '<br>')
    
    invoice_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sportix Invoice - #{order.id}</title>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', -apple-system, sans-serif; color: #333; line-height: 1.4; padding: 20px; }}
            .invoice-box {{ max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.15); border-radius: 10px; }}
            .invoice-header {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
            .brand {{ font-size: 1.8rem; font-weight: bold; color: #00ffaa; background: #0a0f1d; padding: 5px 15px; border-radius: 5px; display: inline-block; }}
            .invoice-details {{ text-align: right; }}
            .billing-info {{ display: flex; justify-content: space-between; margin-bottom: 40px; }}
            .bill-to, .ship-to {{ width: 45%; }}
            .invoice-table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
            .invoice-table th {{ background: #f5f5f5; padding: 10px; border-bottom: 2px solid #ddd; font-weight: 600; }}
            .totals-section {{ display: flex; justify-content: flex-end; }}
            .totals-table {{ width: 300px; }}
            .totals-table td {{ padding: 8px 0; }}
            .footer {{ text-align: center; margin-top: 50px; font-size: 0.85rem; color: #888; border-top: 1px solid #eee; padding-top: 20px; }}
            @media print {{
                body {{ padding: 0; }}
                .invoice-box {{ border: none; box-shadow: none; }}
            }}
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="invoice-header">
                <div>
                    <div class="brand" style="background-color: #0a0f1d; color: #00ffaa; padding: 10px 20px; font-family: 'Outfit', sans-serif;">SPORTIX</div>
                    <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">Apex Sports Equipment & Gear</p>
                </div>
                <div class="invoice-details">
                    <h2 style="margin: 0; font-size: 1.5rem;">INVOICE</h2>
                    <p style="margin: 5px 0;">Order ID: <strong>#{order.id}</strong></p>
                    <p style="margin: 5px 0;">Date: {order.created_at.strftime("%B %d, %Y")}</p>
                    <p style="margin: 5px 0;">Payment: {order.payment_method} (Status: {order.payment_status})</p>
                </div>
            </div>
            
            <div class="billing-info">
                <div class="bill-to">
                    <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #666;">CUSTOMER INFO</h4>
                    <strong>{order.customer_name}</strong><br>
                    Email: {order.email}<br>
                </div>
                <div class="ship-to">
                    <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #666;">SHIPPING ADDRESS</h4>
                    {address_html}
                </div>
            </div>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th style="width: 8%; text-align: left;">#</th>
                        <th style="width: 52%; text-align: left;">Item Description</th>
                        <th style="width: 15%; text-align: right;">Unit Price</th>
                        <th style="width: 10%; text-align: center;">Qty</th>
                        <th style="width: 15%; text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align: right;">${subtotal:.2f}</td>
                    </tr>
                    <tr>
                        <td>Estimated Tax (5%):</td>
                        <td style="text-align: right;">${tax:.2f}</td>
                    </tr>
                    <tr>
                        <td>Shipping Fee:</td>
                        <td style="text-align: right;">${shipping_display}</td>
                    </tr>
                    <tr style="font-weight: bold; border-top: 1px solid #333; font-size: 1.1rem;">
                        <td style="padding-top: 10px;">Grand Total:</td>
                        <td style="padding-top: 10px; text-align: right; color: #0d9488;">${grand_total:.2f}</td>
                    </tr>
                </table>
            </div>
            
            <div class="footer">
                <p>Thank you for choosing Sportix! If you have any questions about this invoice, contact support@sportix.com</p>
                <p style="font-size: 0.8rem; margin-top: 5px;">&copy; 2026 Sportix Inc. All rights reserved.</p>
            </div>
        </div>
        <script>
            window.onload = function() {{ window.print(); }}
        </script>
    </body>
    </html>
    """
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=invoice_html)

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
