from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import models
from database import engine, get_db
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
def checkout(order_data: CheckoutInput, db: Session = Depends(get_db)):
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
    # Create the Order
    new_order = models.Order(
        customer_name=order_data.customer_name,
        email=order_data.email,
        address=order_data.address,
        total_price=round(total_price, 2),
        items=items_to_create
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return {
        "success": True,
        "message": "Order placed successfully",
        "order_id": new_order.id,
        "total_price": new_order.total_price,
        "created_at": new_order.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }
