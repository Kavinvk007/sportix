import os
import hashlib
from database import Base, engine, SessionLocal
from models import Product, User, UserPreference

def hash_password(password: str) -> str:
    salt = b"sportix_salt_value"
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return pwd_hash.hex()

def create_database_if_not_exists():
    pass
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
            image_url="assets/images/cricket_antigravity_1781187171745.png",
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
            image_url="assets/images/cricket_antigravity_1781187171745.png",
            sizes="Standard 5.5oz",
            colors="Red,White,Pink",
            stock=20
        ),
        Product(
            name="Adidas Al Rihla Match Football",
            description="A premium, FIFA Quality Pro certified match ball. Features speex shell panel shapes for improved aerodynamics, flight stability, and precision.",
            price=44.99,
            category="Football",
            rating=4.7,
            image_url="assets/images/football_antigravity_1781187184271.png",
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
            image_url="assets/images/football_antigravity_1781187184271.png",
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
            image_url="assets/images/basketball_antigravity_1781187196857.png",
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
            image_url="assets/images/basketball_antigravity_1781187196857.png",
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
            image_url="assets/images/tennis_antigravity_1781187210446.png",
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
            image_url="assets/images/tennis_antigravity_1781187210446.png",
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
            image_url="assets/images/badminton_antigravity_1781187234278.png",
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
            image_url="assets/images/fitness_antigravity_1781187270571.png",
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
            image_url="assets/images/fitness_antigravity_1781187270571.png",
            sizes="Standard Fit",
            colors="Obsidian Black,Coral Red,Porcelain",
            stock=14
        ),
        Product(
            name="Nike Air Zoom Pegasus 40 Running Shoes",
            description="The pegasus returns with responsive cushioning, springy ride, and improved collar padding. Engineered mesh upper for lightweight breathability.",
            price=119.99,
            category="Running",
            rating=4.8,
            image_url="assets/images/running_antigravity_1781187257638.png",
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
            image_url="assets/images/running_antigravity_1781187257638.png",
            sizes="S/M,L/XL",
            colors="Dark Slate Grey",
            stock=15
        ),
        Product(
            name="Mikasa V200W Olympic Match Volleyball",
            description="Official FIVB game ball. Premium microfiber composite cover with double dimple technology for perfect grip and aerodynamic flight.",
            price=79.99,
            category="Volleyball",
            rating=4.9,
            image_url="assets/images/volleyball_antigravity_1781187246466.png",
            sizes="Size 5",
            colors="Yellow/Blue",
            stock=30
        ),
        Product(
            name="Sportix Pro Knee Pads",
            description="High-density foam volleyball knee pads for ultimate joint protection and mobility. Moisture-wicking and slip-resistant design.",
            price=24.99,
            category="Volleyball",
            rating=4.5,
            image_url="assets/images/volleyball_antigravity_1781187246466.png",
            sizes="Small,Medium,Large",
            colors="Black,White",
            stock=45
        )
    ]
    
    db.add_all(products)
    db.commit()
    print("Database successfully seeded with 15 premium sports items.")
def seed_default_user(db):
    existing = db.query(User).filter(User.email == "kavin@sportix.com").first()
    if existing:
        print("Default user already exists. Skipping user seeding.")
        return
    print("Seeding default user: kavin@sportix.com (password: password123)...")
    default_user = User(
        full_name="Kavin Kumar",
        email="kavin@sportix.com",
        password_hash=hash_password("password123"),
        phone_number="123-456-7890",
        profile_picture="assets/images/user_avatar.png"
    )
    db.add(default_user)
    db.commit()
    db.refresh(default_user)
    
    # Add default preferences
    pref = UserPreference(
        user_id=default_user.id,
        theme="dark",
        notify_orders=True,
        notify_offers=False
    )
    db.add(pref)
    db.commit()
    print("Default user and preferences seeded successfully.")

def main():
    try:
        # Recreate SQLite database to ensure the schema updates apply
        db_path = "sportix.db"
        if os.path.exists(db_path):
            print(f"Removing old database file '{db_path}' for schema updates...")
            try:
                os.remove(db_path)
                print("Old database file removed.")
            except Exception as delete_error:
                print(f"Could not remove database file: {delete_error}")
                
        create_database_if_not_exists()
        print("Creating tables in database...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
        
        db = SessionLocal()
        try:
            seed_products(db)
            seed_default_user(db)
        finally:
            db.close()
        print("Database initialization complete.")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
if __name__ == "__main__":
    main()
