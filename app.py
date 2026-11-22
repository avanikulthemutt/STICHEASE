import os
import mysql.connector
import secrets

from datetime import date, time, datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)

# ====================================================
#                  WEBSITE PAGE ROUTES
# ====================================================

@app.route("/")
def customer_home():
    return send_from_directory(app.root_path, "index.html")


@app.route("/customer")
def customer_dashboard():
    return send_from_directory(app.root_path, "index.html")


@app.route("/about")
def about_page():
    return send_from_directory(app.root_path, "about.html")


@app.route("/admin")
def admin_home():
    return send_from_directory(app.root_path, "admin.html")


@app.route("/chatbot")
def chatbot_home():
    return send_from_directory(app.root_path, "chatbot.html")


@app.route("/style.css")
def website_css():
    return send_from_directory(app.root_path, "style.css")


@app.route("/script.js")
def customer_javascript():
    return send_from_directory(app.root_path, "script.js")


@app.route("/admin.js")
def admin_javascript():
    return send_from_directory(app.root_path, "admin.js")


@app.route("/about-tailoring.jpg..jpg")
def tailoring_image():
    return send_from_directory(app.root_path, "about-tailoring.jpg..jpg")


# ====================================================
#                 EXPLORE FASHION ROUTES
# ====================================================

@app.route("/explore-fashion")
def explore_fashion():
    return send_from_directory(app.root_path, "explore-fashion.html")


@app.route("/explore-fashion.css")
def explore_fashion_css():
    return send_from_directory(app.root_path, "explore-fashion.css")


@app.route("/explore-fashion.js")
def explore_fashion_javascript():
    return send_from_directory(app.root_path, "explore-fashion.js")


@app.route("/images/<path:filename>")
def serve_images(filename):
    return send_from_directory(
        os.path.join(app.root_path, "images"),
        filename
    )


# ====================================================
#                  SESSION CONFIGURATION
# ====================================================

app.secret_key = os.getenv("FLASK_SECRET_KEY") or secrets.token_hex(32)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False
)

CORS(app, supports_credentials=True)


# ====================================================
#                   DATABASE CONNECTION
# ====================================================

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.environ["STITCH_DB_PASSWORD"],
        database=os.getenv("DB_NAME", "stitchease")
    )


def close_db(cursor=None, connection=None):
    if cursor:
        cursor.close()

    if connection and connection.is_connected():
        connection.close()


def admin_required():
    return session.get("admin_id") is not None


# ====================================================
#             ADMIN MODULE DATABASE TABLES
# ====================================================

def ensure_admin_module_tables(cursor):
    """
    Automatically creates the Fabrics, Tailors and
    Tailor Order Assignment tables if they do not exist.
    """

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fabrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            fabric_type VARCHAR(100) NOT NULL,
            quantity INT NOT NULL DEFAULT 0,
            low_stock_threshold INT NOT NULL DEFAULT 5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tailors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            phone VARCHAR(30),
            email VARCHAR(150),
            specialisation VARCHAR(150),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tailor_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tailor_id INT NOT NULL,
            order_id INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_order_assignment (order_id),
            CONSTRAINT fk_tailor_orders_tailor
                FOREIGN KEY (tailor_id)
                REFERENCES tailors(id)
                ON DELETE CASCADE,
            CONSTRAINT fk_tailor_orders_order
                FOREIGN KEY (order_id)
                REFERENCES custom_orders(id)
                ON DELETE CASCADE
        )
    """)


# ====================================================
#                 DATE/TIME CONVERSION
# ====================================================

def convert_dates(record):
    if not record:
        return record

    for key, value in record.items():

        if isinstance(value, timedelta):
            total_seconds = int(value.total_seconds())
            sign = "-" if total_seconds < 0 else ""

            hours, remainder = divmod(abs(total_seconds), 3600)
            minutes, seconds = divmod(remainder, 60)

            record[key] = (
                f"{sign}{hours:02d}:{minutes:02d}:{seconds:02d}"
            )

        elif isinstance(value, (date, time, datetime)):
            record[key] = value.isoformat()

        elif key == "estimated_price" and value is not None:
            record[key] = float(value)

        elif value is not None and hasattr(value, "as_integer_ratio"):
            if key.endswith("_cm"):
                record[key] = float(value)

    return record


# ====================================================
#                    DATABASE TEST
# ====================================================

@app.route("/api/test", methods=["GET"])
def test_database():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]

        return jsonify({
            "message": "Stitchease database connected!",
            "tables": tables
        })

    except Exception:
        app.logger.exception("Database connection failed")

        return jsonify({
            "error": "Database connection failed. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                     CUSTOMER APIs
# ====================================================

# ---------------- CUSTOMER REGISTRATION ----------------

@app.route("/api/register", methods=["POST"])
def register_customer():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Please fill all the fields."}), 400

    if not isinstance(password, str) or len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        password_hash = generate_password_hash(
            password,
            method="pbkdf2:sha256"
        )

        cursor.execute("""
            INSERT INTO customers (name, email, password_hash)
            VALUES (%s, %s, %s)
        """, (name, email, password_hash))

        connection.commit()

        return jsonify({
            "message": "Registration successful! Now login."
        }), 201

    except mysql.connector.IntegrityError:
        return jsonify({
            "error": "This email may already be registered."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Customer registration failed")

        return jsonify({
            "error": "Registration failed. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


# ---------------- CUSTOMER LOGIN ----------------

@app.route("/api/login", methods=["POST"])
def login_customer():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Please enter email and password."
        }), 400

    if not isinstance(password, str):
        return jsonify({"error": "Invalid password."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, email, password_hash
            FROM customers
            WHERE email = %s
        """, (email,))

        customer = cursor.fetchone()

        if not customer or not check_password_hash(
            customer["password_hash"], password
        ):
            return jsonify({
                "error": "Invalid email or password."
            }), 401

        return jsonify({
            "message": "Login successful!",
            "customer": {
                "id": customer["id"],
                "name": customer["name"],
                "email": customer["email"]
            }
        })

    except Exception:
        app.logger.exception("Customer login failed")

        return jsonify({
            "error": "Login failed. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


# ---------------- GET CUSTOMER PROFILE ----------------

@app.route("/api/profile/<int:customer_id>", methods=["GET"])
def get_customer_profile(customer_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                c.id, c.name, c.email,
                m.phone, m.address,
                m.height_cm, m.shoulder_cm,
                m.bust_cm, m.waist_cm, m.hip_cm,
                m.sleeve_cm, m.dress_length_cm
            FROM customers c
            LEFT JOIN measurements m
                ON c.id = m.customer_id
            WHERE c.id = %s
        """, (customer_id,))

        profile = cursor.fetchone()

        if not profile:
            return jsonify({"error": "Customer not found."}), 404

        for key, value in profile.items():
            if value is not None and key.endswith("_cm"):
                profile[key] = float(value)

        return jsonify(profile)

    except Exception:
        app.logger.exception("Loading customer profile failed")

        return jsonify({"error": "Could not load profile."}), 500

    finally:
        close_db(cursor, connection)


# ---------------- SAVE CUSTOMER PROFILE ----------------

@app.route("/api/profile/<int:customer_id>", methods=["POST"])
def save_customer_profile(customer_id):
    data = request.get_json(silent=True) or {}

    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip().lower()

    if not name or not email:
        return jsonify({
            "error": "Name and email are required."
        }), 400

    def measurement_value(key):
        value = data.get(key)

        if value is None or str(value).strip() == "":
            return None

        number = float(value)

        if number <= 0:
            raise ValueError("Measurements must be positive.")

        return number

    try:
        measurements = (
            measurement_value("height"),
            measurement_value("shoulder"),
            measurement_value("bust"),
            measurement_value("waist"),
            measurement_value("hip"),
            measurement_value("sleeve"),
            measurement_value("dressLength")
        )

    except (ValueError, TypeError):
        return jsonify({
            "error": "Enter valid positive numbers for measurements."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM customers WHERE id = %s",
            (customer_id,)
        )

        if not cursor.fetchone():
            return jsonify({"error": "Customer not found."}), 404

        cursor.execute("""
            UPDATE customers
            SET name = %s, email = %s
            WHERE id = %s
        """, (name, email, customer_id))

        cursor.execute("""
            INSERT INTO measurements (
                customer_id, phone, address,
                height_cm, shoulder_cm, bust_cm,
                waist_cm, hip_cm, sleeve_cm,
                dress_length_cm
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)

            ON DUPLICATE KEY UPDATE
                phone = VALUES(phone),
                address = VALUES(address),
                height_cm = VALUES(height_cm),
                shoulder_cm = VALUES(shoulder_cm),
                bust_cm = VALUES(bust_cm),
                waist_cm = VALUES(waist_cm),
                hip_cm = VALUES(hip_cm),
                sleeve_cm = VALUES(sleeve_cm),
                dress_length_cm = VALUES(dress_length_cm)
        """, (
            customer_id,
            str(data.get("phone") or "").strip(),
            str(data.get("address") or "").strip(),
            *measurements
        ))

        connection.commit()

        return jsonify({
            "message": "Profile and measurements saved successfully!"
        })

    except mysql.connector.IntegrityError:
        if connection:
            connection.rollback()

        return jsonify({
            "error": "This email may already belong to another customer."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Saving customer profile failed")

        return jsonify({
            "error": "Could not save profile. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


# ---------------- CUSTOMER APPOINTMENTS ----------------

@app.route("/api/appointments", methods=["POST"])
def book_customer_appointment():
    data = request.get_json(silent=True) or {}

    try:
        customer_id = int(data.get("customer_id"))
        appointment_date = datetime.strptime(
            str(data.get("date") or "").strip(),
            "%Y-%m-%d"
        ).date()

        time_value = str(data.get("time") or "").strip()
        appointment_time = None

        for time_format in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
            try:
                appointment_time = datetime.strptime(
                    time_value, time_format
                ).time()
                break
            except ValueError:
                continue

        if appointment_time is None:
            raise ValueError("Invalid appointment time")

    except (ValueError, TypeError):
        return jsonify({
            "error": "Please select a valid appointment date and time."
        }), 400

    purpose = str(data.get("purpose") or "").strip()
    notes = str(data.get("notes") or "").strip()

    if not purpose:
        return jsonify({
            "error": "Please enter the appointment purpose."
        }), 400

    if appointment_date < date.today():
        return jsonify({
            "error": "Please choose today or a future date."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM customers WHERE id = %s",
            (customer_id,)
        )

        if not cursor.fetchone():
            return jsonify({
                "error": "Customer account not found. Please log in again."
            }), 404

        cursor.execute("""
            INSERT INTO appointments (
                customer_id, appointment_date, appointment_time,
                purpose, notes, status
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            customer_id,
            appointment_date,
            appointment_time,
            purpose,
            notes,
            "Requested"
        ))

        appointment_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Your appointment request has been saved successfully!",
            "appointment_id": appointment_id
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Booking customer appointment failed")

        return jsonify({
            "error": "Could not book appointment. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/appointments/<int:customer_id>", methods=["GET"])
def get_customer_appointments(customer_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id, customer_id, appointment_date, appointment_time,
                purpose, notes, status, created_at
            FROM appointments
            WHERE customer_id = %s
            ORDER BY appointment_date DESC, appointment_time DESC
        """, (customer_id,))

        appointments = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        return jsonify({"appointments": appointments})

    except Exception:
        app.logger.exception("Loading customer appointments failed")

        return jsonify({
            "error": "Could not load appointments. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                 CUSTOMER CUSTOM ORDERS
# ====================================================

ORDER_BASE_PRICES = {
    "Kurti": 1000,
    "Saree Blouse": 1200,
    "Lehenga": 3500,
    "Gown": 2800,
    "Dress": 1500,
    "Other": 1500
}

FABRIC_EXTRA_PRICES = {
    "cotton": 0,
    "rayon": 100,
    "linen": 150,
    "crepe": 150,
    "georgette": 200,
    "chiffon": 200,
    "net": 150,
    "satin": 250,
    "velvet": 400,
    "silk": 500,
    "banarasi": 800
}


def detect_design_complexity(description):
    value = str(description or "").lower()

    heavy_words = [
        "heavy", "bridal", "zari", "embroidery", "embroidered",
        "mirror work", "stone work", "stones", "sequins", "sequence",
        "beads", "handwork", "kundan", "maggam", "cutdana"
    ]

    moderate_words = [
        "lace", "piping", "pleats", "frill", "ruffle", "border",
        "cutwork", "lining", "gathering", "moderate"
    ]

    if any(word in value for word in heavy_words):
        return "heavy"

    if any(word in value for word in moderate_words):
        return "moderate"

    return "simple"


def calculate_custom_order_price(outfit_type, fabric, description, duration):
    base_price = ORDER_BASE_PRICES.get(outfit_type, 1000)

    fabric_value = str(fabric or "").lower()
    fabric_extra = 100 if fabric_value else 0

    for fabric_name, extra in FABRIC_EXTRA_PRICES.items():
        if fabric_name in fabric_value:
            fabric_extra = extra
            break

    complexity = detect_design_complexity(description)

    design_extra = {
        "simple": 0,
        "moderate": 700,
        "heavy": 1500
    }[complexity]

    rush_extra = max(0, 7 - int(duration)) * 50

    return int(base_price + fabric_extra + design_extra + rush_extra)


@app.route("/api/orders", methods=["POST"])
def create_custom_order():
    data = request.get_json(silent=True) or {}

    try:
        customer_id = int(data.get("customer_id"))
        outfit_type = str(data.get("outfit_type") or "").strip()
        colour = str(data.get("colour") or "").strip()
        fabric = str(data.get("fabric") or "").strip()
        occasion = str(data.get("occasion") or "").strip()
        description = str(data.get("description") or "").strip()
        duration = int(data.get("duration_days") or 5)
        payment_mode = str(data.get("payment_mode") or "").strip()

    except (TypeError, ValueError):
        return jsonify({
            "error": "Please enter valid order details."
        }), 400

    if not outfit_type or not colour or not fabric or not payment_mode:
        return jsonify({
            "error": "Please complete the required order details."
        }), 400

    if duration not in (3, 5, 7, 10, 14):
        return jsonify({
            "error": "Please choose a valid customization duration."
        }), 400

    estimated_price = calculate_custom_order_price(
        outfit_type, fabric, description, duration
    )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT id FROM customers WHERE id = %s",
            (customer_id,)
        )

        if not cursor.fetchone():
            return jsonify({
                "error": "Customer account not found. Please log in again."
            }), 404

        cursor.execute("""
            INSERT INTO custom_orders (
                customer_id, outfit_type, colour, fabric, occasion,
                description, duration_days, payment_mode,
                estimated_price, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            customer_id, outfit_type, colour, fabric, occasion,
            description, duration, payment_mode,
            estimated_price, "Placed"
        ))

        order_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Your custom order has been placed successfully!",
            "order_id": order_id,
            "estimated_price": estimated_price
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Creating custom order failed")

        return jsonify({
            "error": "Could not place order. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/orders/<int:customer_id>", methods=["GET"])
def get_customer_custom_orders(customer_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id, customer_id, outfit_type, colour, fabric,
                occasion, description, duration_days, payment_mode,
                estimated_price, status, created_at
            FROM custom_orders
            WHERE customer_id = %s
            ORDER BY created_at DESC
        """, (customer_id,))

        orders = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        return jsonify({"orders": orders})

    except Exception:
        app.logger.exception("Loading customer orders failed")

        return jsonify({
            "error": "Could not load your orders."
        }), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                     ADMIN AUTHENTICATION
# ====================================================

@app.route("/api/admin/register", methods=["POST"])
def register_admin():
    data = request.get_json(silent=True) or {}

    name = str(
        data.get("name") or data.get("full_name") or ""
    ).strip()

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Please fill all the fields."}), 400

    if not isinstance(password, str) or len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total FROM admins")
        admin_count = cursor.fetchone()["total"]

        if admin_count > 0 and not admin_required():
            return jsonify({
                "error": "Admin registration is restricted. Please log in as an administrator."
            }), 403

        password_hash = generate_password_hash(
            password,
            method="pbkdf2:sha256"
        )

        cursor.execute("""
            INSERT INTO admins (full_name, email, password_hash)
            VALUES (%s, %s, %s)
        """, (name, email, password_hash))

        connection.commit()

        return jsonify({
            "message": "Admin registration successful. Please log in."
        }), 201

    except mysql.connector.IntegrityError:
        return jsonify({
            "error": "This admin email is already registered."
        }), 409

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Admin registration failed")

        return jsonify({
            "error": "Admin registration failed. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/login", methods=["POST"])
def login_admin():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Please enter your admin email and password."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, full_name, email, password_hash
            FROM admins
            WHERE email = %s
        """, (email,))

        admin = cursor.fetchone()

        if not admin or not check_password_hash(
            admin["password_hash"], password
        ):
            return jsonify({
                "error": "Invalid admin email or password."
            }), 401

        session.clear()
        session["admin_id"] = admin["id"]

        return jsonify({
            "message": "Admin login successful!",
            "admin": {
                "id": admin["id"],
                "name": admin["full_name"],
                "email": admin["email"]
            }
        })

    except Exception:
        app.logger.exception("Admin login failed")

        return jsonify({
            "error": "Admin login failed. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/me", methods=["GET"])
def current_admin():
    if not admin_required():
        return jsonify({
            "error": "Please log in as an administrator."
        }), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, full_name, email
            FROM admins
            WHERE id = %s
        """, (session["admin_id"],))

        admin = cursor.fetchone()

        if not admin:
            session.clear()
            return jsonify({"error": "Admin account not found."}), 404

        return jsonify({
            "admin": {
                "id": admin["id"],
                "name": admin["full_name"],
                "email": admin["email"]
            }
        })

    except Exception:
        app.logger.exception("Loading admin session failed")

        return jsonify({
            "error": "Could not verify admin session."
        }), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/logout", methods=["POST"])
def logout_admin():
    session.clear()
    return jsonify({"message": "Logged out successfully."})


# ====================================================
#                   ADMIN DASHBOARD
# ====================================================

@app.route("/api/admin/dashboard", methods=["GET"])
def admin_dashboard():
    if not admin_required():
        return jsonify({
            "error": "Please log in to access the dashboard."
        }), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        ensure_reviews_table(cursor)

        # Add payment tracking column safely if it does not exist.
        cursor.execute("SHOW COLUMNS FROM custom_orders LIKE 'payment_status'")
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE custom_orders
                ADD COLUMN payment_status VARCHAR(30)
                NOT NULL DEFAULT 'Pending'
            """)

        cursor.execute("""
            SELECT
                co.id, co.customer_id, c.name AS customer_name,
                co.outfit_type, co.colour, co.fabric, co.occasion,
                co.description, co.duration_days, co.payment_mode,
                co.estimated_price, co.payment_status,
                co.status, co.created_at
            FROM custom_orders co
            LEFT JOIN customers c ON co.customer_id = c.id
            ORDER BY co.created_at DESC
        """)

        orders = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        cursor.execute("""
            SELECT
                a.id, a.customer_id, c.name AS customer_name,
                c.email, a.appointment_date, a.appointment_time,
                a.purpose, a.notes, a.status, a.created_at
            FROM appointments a
            LEFT JOIN customers c ON a.customer_id = c.id
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        """)

        appointments = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        cursor.execute("""
            SELECT
                c.id, c.name, c.email, m.phone, c.created_at
            FROM customers c
            LEFT JOIN measurements m ON c.id = m.customer_id
            ORDER BY c.created_at DESC
        """)

        customers = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        cursor.execute("""
            SELECT
                r.id, r.customer_id, c.name AS customer_name,
                c.email, r.rating, r.review_text, r.created_at
            FROM reviews r
            LEFT JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        """)

        reviews = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        average_rating = (
            round(sum(int(review["rating"]) for review in reviews) / len(reviews), 1)
            if reviews else 0
        )

        pending_orders = sum(
            1 for order in orders
            if str(order.get("status") or "").lower()
            not in ("completed", "cancelled", "delivered")
        )

        return jsonify({
            "message": "Dashboard data loaded successfully.",
            "dashboard": {
                "orders": orders,
                "appointments": appointments,
                "customers": customers,
                "reviews": reviews,
                "total_reviews": len(reviews),
                "average_rating": average_rating,
                "total_customers": len(customers),
                "total_appointments": len(appointments),
                "total_orders": len(orders),
                "pending_orders": pending_orders
            }
        })

    except Exception:
        app.logger.exception("Admin dashboard loading failed")

        return jsonify({
            "error": "Could not load dashboard data. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)




# ====================================================
#                 ADMIN PAYMENT MANAGEMENT
# ====================================================

@app.route("/api/admin/payments/<int:order_id>", methods=["PATCH"])
def update_admin_payment(order_id):
    if not admin_required():
        return jsonify({
            "error": "Please log in as an administrator."
        }), 401

    data = request.get_json(silent=True) or {}
    payment_status = str(data.get("payment_status") or "").strip()

    allowed_statuses = [
        "Pending",
        "Paid",
        "Partially Paid",
        "Refunded"
    ]

    if payment_status not in allowed_statuses:
        return jsonify({"error": "Invalid payment status."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE custom_orders
            SET payment_status = %s
            WHERE id = %s
        """, (payment_status, order_id))

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT id FROM custom_orders WHERE id = %s",
                (order_id,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "error": "Custom order not found."
                }), 404

        connection.commit()

        return jsonify({
            "message": "Payment status updated successfully."
        })

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Updating payment status failed")

        return jsonify({
            "error": "Could not update payment status."
        }), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                 ADMIN ORDER MANAGEMENT
# ====================================================

@app.route("/api/admin/orders/<int:order_id>", methods=["PATCH"])
def update_admin_order(order_id):
    if not admin_required():
        return jsonify({
            "error": "Please log in as an administrator."
        }), 401

    data = request.get_json(silent=True) or {}
    status = str(data.get("status") or "").strip()

    allowed_statuses = [
        "Placed",
        "Confirmed",
        "Measured",
        "In Progress",
        "Trial",
        "Ready",
        "Completed",
        "Cancelled"
    ]

    if status not in allowed_statuses:
        return jsonify({"error": "Invalid order status."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE custom_orders
            SET status = %s
            WHERE id = %s
        """, (status, order_id))

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT id FROM custom_orders WHERE id = %s",
                (order_id,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "error": "Custom order not found."
                }), 404

        connection.commit()

        return jsonify({
            "message": "Custom order status updated successfully."
        })

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Updating custom order failed")

        return jsonify({
            "error": "Could not update order status."
        }), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#              ADMIN APPOINTMENT MANAGEMENT
# ====================================================

@app.route("/api/admin/appointments/<int:appointment_id>", methods=["PATCH"])
def update_admin_appointment(appointment_id):
    if not admin_required():
        return jsonify({
            "error": "Please log in as an administrator."
        }), 401

    data = request.get_json(silent=True) or {}
    status = str(data.get("status") or "").strip()

    allowed_statuses = [
        "Booked",
        "Requested",
        "Confirmed",
        "Completed",
        "Cancelled"
    ]

    if status not in allowed_statuses:
        return jsonify({"error": "Invalid appointment status."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE appointments
            SET status = %s
            WHERE id = %s
        """, (status, appointment_id))

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT id FROM appointments WHERE id = %s",
                (appointment_id,)
            )

            if not cursor.fetchone():
                return jsonify({
                    "error": "Appointment not found."
                }), 404

        connection.commit()

        return jsonify({
            "message": "Appointment status updated successfully."
        })

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Updating appointment failed")

        return jsonify({
            "error": "Could not update appointment status."
        }), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                  FABRICS & STOCK
# ====================================================

@app.route("/api/admin/fabrics", methods=["GET"])
def get_admin_fabrics():
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        ensure_admin_module_tables(cursor)

        cursor.execute("""
            SELECT id, name, fabric_type, quantity,
                   low_stock_threshold, created_at, updated_at
            FROM fabrics
            ORDER BY name ASC
        """)

        fabrics = [convert_dates(row) for row in cursor.fetchall()]

        for fabric in fabrics:
            quantity = int(fabric["quantity"])
            threshold = int(fabric["low_stock_threshold"])

            if quantity <= 0:
                fabric["stock_status"] = "Out of Stock"
            elif quantity <= threshold:
                fabric["stock_status"] = "Low Stock"
            else:
                fabric["stock_status"] = "Available"

        connection.commit()
        return jsonify({"fabrics": fabrics})

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Loading fabrics failed")
        return jsonify({"error": "Could not load fabrics."}), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/fabrics", methods=["POST"])
def add_admin_fabric():
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    data = request.get_json(silent=True) or {}

    name = str(data.get("name") or "").strip()
    fabric_type = str(data.get("fabric_type") or "").strip()

    try:
        quantity = int(data.get("quantity", 0))
        threshold = int(data.get("low_stock_threshold", 5))

        if quantity < 0 or threshold < 0:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({
            "error": "Quantity and low-stock threshold must be zero or greater."
        }), 400

    if not name or not fabric_type:
        return jsonify({
            "error": "Fabric name and type are required."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        ensure_admin_module_tables(cursor)

        cursor.execute("""
            INSERT INTO fabrics (name, fabric_type, quantity, low_stock_threshold)
            VALUES (%s, %s, %s, %s)
        """, (name, fabric_type, quantity, threshold))

        fabric_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Fabric added successfully.",
            "id": fabric_id
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Adding fabric failed")
        return jsonify({"error": "Could not add fabric."}), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/fabrics/<int:fabric_id>", methods=["PATCH"])
def update_admin_fabric(fabric_id):
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    data = request.get_json(silent=True) or {}

    name = str(data.get("name") or "").strip()
    fabric_type = str(data.get("fabric_type") or "").strip()

    try:
        quantity = int(data.get("quantity"))
        threshold = int(data.get("low_stock_threshold", 5))

        if quantity < 0 or threshold < 0:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({
            "error": "Enter valid non-negative stock quantities."
        }), 400

    if not name or not fabric_type:
        return jsonify({
            "error": "Fabric name and type are required."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        ensure_admin_module_tables(cursor)

        cursor.execute("""
            UPDATE fabrics
            SET name = %s, fabric_type = %s,
                quantity = %s, low_stock_threshold = %s
            WHERE id = %s
        """, (name, fabric_type, quantity, threshold, fabric_id))

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT id FROM fabrics WHERE id = %s",
                (fabric_id,)
            )
            if not cursor.fetchone():
                return jsonify({"error": "Fabric not found."}), 404

        connection.commit()
        return jsonify({"message": "Fabric updated successfully."})

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Updating fabric failed")
        return jsonify({"error": "Could not update fabric."}), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/fabrics/<int:fabric_id>", methods=["DELETE"])
def delete_admin_fabric(fabric_id):
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        ensure_admin_module_tables(cursor)

        cursor.execute(
            "DELETE FROM fabrics WHERE id = %s",
            (fabric_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Fabric not found."}), 404

        connection.commit()
        return jsonify({"message": "Fabric deleted successfully."})

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Deleting fabric failed")
        return jsonify({"error": "Could not delete fabric."}), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                    MEASUREMENTS
# ====================================================

@app.route("/api/admin/measurements", methods=["GET"])
def get_admin_measurements():
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                c.id AS customer_id,
                c.name AS customer_name,
                c.email,
                m.phone,
                m.address,
                m.height_cm,
                m.shoulder_cm,
                m.bust_cm,
                m.waist_cm,
                m.hip_cm,
                m.sleeve_cm,
                m.dress_length_cm
            FROM customers c
            INNER JOIN measurements m
                ON c.id = m.customer_id
            ORDER BY c.name ASC
        """)

        measurements = cursor.fetchall()

        for row in measurements:
            for key, value in row.items():
                if value is not None and key.endswith("_cm"):
                    row[key] = float(value)

        return jsonify({"measurements": measurements})

    except Exception:
        app.logger.exception("Loading admin measurements failed")
        return jsonify({"error": "Could not load customer measurements."}), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                       TAILORS
# ====================================================

@app.route("/api/admin/tailors", methods=["GET"])
def get_admin_tailors():
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        ensure_admin_module_tables(cursor)

        cursor.execute("""
            SELECT
                t.id,
                t.name,
                t.phone,
                t.email,
                t.specialisation,
                t.notes,
                t.created_at,
                COUNT(toa.id) AS assigned_order_count
            FROM tailors t
            LEFT JOIN tailor_orders toa
                ON t.id = toa.tailor_id
            GROUP BY
                t.id, t.name, t.phone, t.email,
                t.specialisation, t.notes, t.created_at
            ORDER BY t.name ASC
        """)

        tailors = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        for tailor in tailors:
            tailor["assigned_orders"] = int(
                tailor["assigned_order_count"]
            )

        connection.commit()
        return jsonify({"tailors": tailors})

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Loading tailors failed")
        return jsonify({"error": "Could not load tailors."}), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/tailors", methods=["POST"])
def add_admin_tailor():
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    data = request.get_json(silent=True) or {}

    name = str(data.get("name") or "").strip()
    phone = str(data.get("phone") or "").strip()
    email = str(data.get("email") or "").strip()
    specialisation = str(
        data.get("specialisation") or ""
    ).strip()
    notes = str(data.get("notes") or "").strip()

    if not name:
        return jsonify({"error": "Tailor name is required."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        ensure_admin_module_tables(cursor)

        cursor.execute("""
            INSERT INTO tailors (
                name, phone, email, specialisation, notes
            )
            VALUES (%s, %s, %s, %s, %s)
        """, (name, phone, email, specialisation, notes))

        tailor_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Tailor added successfully.",
            "id": tailor_id
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Adding tailor failed")
        return jsonify({"error": "Could not add tailor."}), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/tailors/<int:tailor_id>", methods=["PATCH"])
def update_admin_tailor(tailor_id):
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    data = request.get_json(silent=True) or {}

    name = str(data.get("name") or "").strip()
    phone = str(data.get("phone") or "").strip()
    email = str(data.get("email") or "").strip()
    specialisation = str(
        data.get("specialisation") or ""
    ).strip()
    notes = str(data.get("notes") or "").strip()

    if not name:
        return jsonify({"error": "Tailor name is required."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        ensure_admin_module_tables(cursor)

        cursor.execute("""
            UPDATE tailors
            SET name = %s, phone = %s, email = %s,
                specialisation = %s, notes = %s
            WHERE id = %s
        """, (
            name, phone, email, specialisation, notes, tailor_id
        ))

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT id FROM tailors WHERE id = %s",
                (tailor_id,)
            )
            if not cursor.fetchone():
                return jsonify({"error": "Tailor not found."}), 404

        connection.commit()
        return jsonify({"message": "Tailor updated successfully."})

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Updating tailor failed")
        return jsonify({"error": "Could not update tailor."}), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/tailors/<int:tailor_id>", methods=["DELETE"])
def delete_admin_tailor(tailor_id):
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        ensure_admin_module_tables(cursor)

        cursor.execute(
            "DELETE FROM tailors WHERE id = %s",
            (tailor_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Tailor not found."}), 404

        connection.commit()
        return jsonify({"message": "Tailor deleted successfully."})

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Deleting tailor failed")
        return jsonify({"error": "Could not delete tailor."}), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                 TAILOR ORDER ASSIGNMENT
# ====================================================

@app.route("/api/admin/tailors/<int:tailor_id>/assign", methods=["POST"])
def assign_order_to_tailor(tailor_id):
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    data = request.get_json(silent=True) or {}

    try:
        order_id = int(data.get("order_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Please select a valid order."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        ensure_admin_module_tables(cursor)

        cursor.execute(
            "SELECT id FROM tailors WHERE id = %s",
            (tailor_id,)
        )

        if not cursor.fetchone():
            return jsonify({"error": "Tailor not found."}), 404

        cursor.execute(
            "SELECT id FROM custom_orders WHERE id = %s",
            (order_id,)
        )

        if not cursor.fetchone():
            return jsonify({"error": "Custom order not found."}), 404

        cursor.execute("""
            INSERT INTO tailor_orders (tailor_id, order_id)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE
                tailor_id = VALUES(tailor_id),
                assigned_at = CURRENT_TIMESTAMP
        """, (tailor_id, order_id))

        connection.commit()

        return jsonify({
            "message": "Order assigned to tailor successfully."
        })

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Assigning order to tailor failed")
        return jsonify({"error": "Could not assign order to tailor."}), 500

    finally:
        close_db(cursor, connection)




# ====================================================
#                    CUSTOMER REVIEWS
# ====================================================

def ensure_reviews_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            rating TINYINT NOT NULL,
            review_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_reviews_customer
                FOREIGN KEY (customer_id)
                REFERENCES customers(id)
                ON DELETE CASCADE
        )
    """)


@app.route("/api/reviews", methods=["POST"])
def submit_customer_review():
    data = request.get_json(silent=True) or {}

    try:
        customer_id = int(data.get("customer_id"))
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        return jsonify({"error": "Please select a valid rating and log in."}), 400

    review_text = str(data.get("review_text") or "").strip()

    if rating < 1 or rating > 5:
        return jsonify({"error": "Please select a rating between 1 and 5."}), 400

    if not review_text:
        return jsonify({"error": "Please write your feedback before submitting."}), 400

    if len(review_text) > 1000:
        return jsonify({"error": "Your review must be 1000 characters or fewer."}), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        ensure_reviews_table(cursor)

        cursor.execute(
            "SELECT id FROM customers WHERE id = %s",
            (customer_id,)
        )

        if not cursor.fetchone():
            return jsonify({"error": "Customer account not found. Please log in again."}), 404

        cursor.execute("""
            INSERT INTO reviews (customer_id, rating, review_text)
            VALUES (%s, %s, %s)
        """, (customer_id, rating, review_text))

        connection.commit()

        return jsonify({
            "message": "Thank you! Your review has been submitted successfully."
        }), 201

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Customer review submission failed")
        return jsonify({"error": "Could not submit your review. Please try again."}), 500

    finally:
        close_db(cursor, connection)


@app.route("/api/admin/reviews/<int:review_id>", methods=["DELETE"])
def delete_admin_review(review_id):
    if not admin_required():
        return jsonify({"error": "Please log in as an administrator."}), 401

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        ensure_reviews_table(cursor)

        cursor.execute(
            "DELETE FROM reviews WHERE id = %s",
            (review_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Review not found."}), 404

        connection.commit()

        return jsonify({"message": "Review deleted successfully."})

    except Exception:
        if connection:
            connection.rollback()

        app.logger.exception("Deleting customer review failed")
        return jsonify({"error": "Could not delete the review."}), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                    START FLASK SERVER
# ====================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=False
    )