# Sportix - Premium Sports E-Commerce Platform

Sportix is a modern, production-ready sports e-commerce web application. It features a scalable FastAPI backend, a sleek responsive frontend, and a fully functional administrative dashboard.

## 🌟 Key Features

**E-Commerce Core**
* **Dynamic Product Catalog**: Browse gear by sport, filter by categories, and search in real-time.
* **Shopping Cart & Checkout**: Secure simulated checkout with form validation and real-time math.
* **Inventory Management**: Built-in stock limits that automatically deduct upon successful orders.
* **Coupons & Discounts**: Apply custom discount codes natively during checkout.

**User Experience**
* **JWT Authentication**: Secure user registration, login, and profile management.
* **Order Tracking Timeline**: Visual milestone tracking (Pending → Processing → Shipped → Delivered).
* **PDF Invoice Generation**: Download beautifully formatted PDF receipts for any placed order.
* **Wishlist System**: Save favorite products across sessions.
* **Product Reviews & Ratings**: Authenticated users can leave and view reviews.

**👑 Administrative Dashboard**
* **Role-Based Access Control**: Secure `/api/admin` routes protected by JWT admin claims.
* **Analytics**: Real-time sales, user, and order statistics.
* **Inventory Control**: Add, edit, or delete products seamlessly via UI modals.
* **Order & User Moderation**: Update order statuses and moderate user accounts/reviews.

## 🏗️ Architecture & Tech Stack

* **Backend**: FastAPI (Python)
* **Database**: MySQL with SQLAlchemy ORM (SQLite used for local dev interchangeably)
* **Frontend**: Vanilla HTML5, CSS3 (Custom Design System), JavaScript (ES6)
* **PDF Generation**: `fpdf2`
* **Deployment Setup**: Pre-configured `vercel.json` for serverless deployment

## 🚀 Setup Instructions (Local Development)

### 1. Configure the Database
Ensure a local SQL database is running (or configure `database.py` for SQLite). By default, Sportix attempts to connect to:
* Host: `localhost` | Port: `3306` | User: `root` | Password: `empty`

### 2. Install Dependencies
Navigate to the `backend` folder and install the Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 3. Initialize the Database
Run the setup script to create tables and insert dummy products:
```bash
python init_db.py
```

### 4. Run the Backend Server
Start the Uvicorn server:
```bash
uvicorn main:app --reload
```
* API runs at: `http://127.0.0.1:8000`
* Swagger Docs: `http://127.0.0.1:8000/docs`

### 5. Run the Frontend
Simply open `frontend/index.html` in your browser, or serve the directory using a lightweight HTTP server:
```bash
cd frontend
python -m http.server 3000
```

## 🌍 Production Environment Configuration
Sportix is ready for production out-of-the-box. The repository includes a `vercel.json` file designed to seamlessly host the frontend statics and map the FastAPI backend to Vercel Serverless Functions.
* Simply connect this repository to your Vercel account.
* The frontend will serve automatically, and `/api/*` routes will hit the backend.

## 📜 License
This project is open-source and available under the MIT License.
