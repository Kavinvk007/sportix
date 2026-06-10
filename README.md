# Sportix - Premium Sports E-Commerce Platform

Sportix is a modern sports e-commerce web application built with a scalable backend and a responsive frontend. It provides a smooth and efficient shopping experience for users across multiple sports categories.

The application uses FastAPI for backend services, MySQL for persistent storage, and a clean HTML, CSS, and JavaScript frontend.

## Features

**Architecture**

* Decoupled backend and frontend
* REST API communication using fetch
* Structured and maintainable codebase

**Database**

* MySQL-based storage
* Data models for products, orders, and order items

**User Interface**

* Dark-themed modern design
* Responsive layout for multiple devices
* Smooth interactions and animations

**E-Commerce Functionality**

* Product categorization by sport
* Search and filtering options
* Cart system with dynamic updates
* Checkout with form validation
* Simulated payment flow

**Automation**

* Database initialization script
* Pre-seeded product data

## Project Structure

sportix/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── init_db.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── .gitignore

## Setup Instructions

### Database Configuration

Ensure MySQL is running locally.

Default configuration:

* Host: localhost
* Port: 3306
* Username: root
* Password: empty

You can override credentials using environment variables.

### Install Dependencies

Navigate to the backend folder and install dependencies:

pip install -r requirements.txt

### Initialize Database

Run the initialization script:

python init_db.py

This will create the database, required tables, and seed product data.

### Run Backend Server

Start the FastAPI server:

uvicorn main:app --reload

Access the API at:
http://127.0.0.1:8000

Swagger documentation:
http://127.0.0.1:8000/docs

### Run Frontend

Open frontend/index.html in a browser or use a local development server.

## GitHub Setup

To push the project to GitHub:

git remote add origin https://github.com/YOUR_USERNAME/sportix.git
git branch -M main
git push -u origin main

## Tech Stack

Backend: FastAPI (Python)
Database: MySQL with SQLAlchemy
Frontend: HTML, CSS, JavaScript
Server: Uvicorn

## Future Enhancements

* User authentication
* Payment gateway integration
* Admin panel
* Order tracking
* Reviews and ratings

## License

This project is open-source and available under the MIT License.

