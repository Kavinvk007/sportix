import os
import pymysql
from sqlalchemy import create_engine, text
from database import DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, Base, engine, SessionLocal
from models import Product
def create_database_if_not_exists():
    print(f"Connecting to MySQL server at {DB_HOST}:{DB_PORT} to check for database '{DB_NAME}'...")
    try:
        # Connect to MySQL server without database
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=int(DB_PORT)
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.commit()
        cursor.close()
        conn.close()
        print(f"Database '{DB_NAME}' created or already exists.")
    except Exception as e:
        print(f"ERROR: Could not connect to MySQL server. Please make sure MySQL is running on {DB_HOST}:{DB_PORT} and credentials are correct.")
        print(f"Details: {e}")
        raise e
def seed_products(db):
    # Check if we already have products
    existing_count = db.query(Product).count()
    if existing_count > 0:
        print(f"Product table already contains {existing_count} products. Skipping seeding.")
        return
    print("Seeding initial sports products and accessories...")
    products = [
        Product(
            name="Kookaburra Kahuna English Willow Bat",
            description="Premium Grade 2 English Willow cricket bat with a massive profile, light pick-up, and hand-crafted spine for ultimate power and control.",
            price=149.99,
            category="Cricket",
            rating=4.8,
            image_url="cricket_bat.png",
            sizes="Short Handle,Long Handle",
            colors="Natural Wood",
            stock=15
        ),
        Product(
            name="Kookaburra Turf Leather Balls (Pack of 6)",
            description="Official match-grade leather cricket balls. Hand-stitched with premium alum-tanned leather for excellent shape retention and seam durability.",
            price=79.99,
            category="Cricket",
            rating=4.5,
            image_url="cricket_balls.png",
            sizes="Standard 5.5oz",
            colors="Red,White,Pink",
            stock=20
        ),
        Product(
            name="Sportix Pro Protective Batting Pads",
            description="Ultra-lightweight high-density foam cricket batting pads. Offers maximum protection, comfortable knee roll support, and quick-release straps.",
            price=59.99,
            category="Cricket",
            rating=4.6,
            image_url="cricket_pads.png",
            sizes="Youth,Adult",
            colors="White",
            stock=12
        ),
        Product(
            name="Adidas Al Rihla Match Football",
            description="A premium, FIFA Quality Pro certified match ball. Features speex shell panel shapes for improved aerodynamics, flight stability, and precision.",
            price=44.99,
            category="Football",
            rating=4.7,
            image_url="football.png",
            sizes="Size 4,Size 5",
            colors="Multi-color White",
            stock=25
        ),
        Product(
            name="Sportix Grip-Max Goalkeeper Gloves",
            description="Professional goalkeeper gloves with 4mm German latex palm for superior grip in all weather. Features ergonomic finger saves and double elastic wrist strap.",
            price=29.99,
            category="Football",
            rating=4.4,
            image_url="goalkeeper_gloves.png",
            sizes="8,9,10",
            colors="Neon Green,Carbon Black",
            stock=18
        ),
        Product(
            name="Wilson Evolution Indoor Basketball",
            description="The preferred high school and college game basketball. Built with a microfiber composite leather cover for unmatched grip, feel, and durability.",
            price=59.99,
            category="Basketball",
            rating=4.9,
            image_url="basketball.png",
            sizes="Size 6 (28.5\"),Size 7 (29.5\")",
            colors="Classic Orange",
            stock=30
        ),
        Product(
            name="Sportix Elite Basketball Jersey",
            description="Lightweight, ultra-breathable moisture-wicking mesh basketball jersey with modern athletic cut and sublimation graphics.",
            price=34.99,
            category="Basketball",
            rating=4.3,
            image_url="basketball_jersey.png",
            sizes="S,M,L,XL,XXL",
            colors="Stealth Black,Electric Cyan",
            stock=40
        ),
        Product(
            name="Wilson Pro Staff 97 Tennis Racket",
            description="Designed for precision and control. Carbon fiber frame with Braid 45 construction for improved pocketing feel and stability during aggressive swings.",
            price=219.99,
            category="Tennis",
            rating=4.8,
            image_url="tennis_racket.png",
            sizes="4 1/4 Grip,4 3/8 Grip",
            colors="Matte Black",
            stock=8
        ),
        Product(
            name="Wilson Championship Tennis Balls (3-Ball Can)",
            description="Premium extra-duty felt tennis balls suitable for all court surfaces. Long-lasting pressure cores provide consistent bounce and response.",
            price=7.99,
            category="Tennis",
            rating=4.5,
            image_url="tennis_balls.png",
            sizes="Standard Can",
            colors="Neon Yellow",
            stock=100
        ),
        Product(
            name="Yonex Muscle Power 29 Badminton Racket",
            description="Full graphite frame and shaft badminton racket. Muscle Power frame locates the string on rounded archways that eliminate stress friction.",
            price=49.99,
            category="Badminton",
            rating=4.6,
            image_url="badminton_racket.png",
            sizes="G4 Grip,G5 Grip",
            colors="Cyan Blue,Vibrant Red",
            stock=22
        ),
        Product(
            name="Sportix Adjustable Dumbbells (Pair, 24kg)",
            description="All-in-one adjustable dumbbells. Dial-turn weight adjustment system from 2.5kg to 24kg. Durable molding around metal plates for smooth lifts.",
            price=189.99,
            category="Fitness & Gym",
            rating=4.7,
            image_url="dumbbells.png",
            sizes="24kg Pair",
            colors="Stealth Chrome Black",
            stock=10
        ),
        Product(
            name="Fitbit Charge 6 Fitness Tracker",
            description="Advanced fitness tracker with built-in GPS, active zone minutes, 24/7 heart rate monitoring, sleep tracking, and up to 7-day battery life.",
            price=129.99,
            category="Fitness & Gym",
            rating=4.6,
            image_url="fitness_tracker.png",
            sizes="Standard Fit",
            colors="Obsidian Black,Coral Red,Porcelain",
            stock=14
        ),
        Product(
            name="Sportix Stainless Steel Bottle (1L)",
            description="Double-walled vacuum insulated water bottle. Keeps water ice cold for 24 hours or piping hot for 12. Leak-proof straw lid and powder-coated grip.",
            price=24.99,
            category="Fitness & Gym",
            rating=4.5,
            image_url="water_bottle.png",
            sizes="1 Liter",
            colors="Matte Black,Arctic Silver,Aqua Blue",
            stock=50
        ),
        Product(
            name="Nike Air Zoom Pegasus 40 Running Shoes",
            description="The pegasus returns with responsive cushioning, springy ride, and improved collar padding. Engineered mesh upper for lightweight breathability.",
            price=119.99,
            category="Running",
            rating=4.8,
            image_url="running_shoes.png",
            sizes="8,9,10,11,12",
            colors="Neon Lime,Classic White,Stealth Black",
            stock=16
        ),
        Product(
            name="Sportix Trail Hydration Vest (2L Bladder)",
            description="Ultra-running trail vest with 2-liter leak-proof hydration bladder, breathable mesh straps, and multiple quick-access pockets for gels and flasks.",
            price=39.99,
            category="Running",
            rating=4.4,
            image_url="hydration_vest.png",
            sizes="S/M,L/XL",
            colors="Dark Slate Grey",
            stock=15
        )
    ]
    
    db.add_all(products)
    db.commit()
    print("Database successfully seeded with 15 premium sports items.")
def main():
    try:
        create_database_if_not_exists()
        print("Creating tables in database...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
        
        db = SessionLocal()
        try:
            seed_products(db)
        finally:
            db.close()
        print("Database initialization complete.")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
if __name__ == "__main__":
    main()
