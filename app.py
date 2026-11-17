import os
import mysql.connector
import secrets

from datetime import date, time, datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)

# ---------------- WEBSITE PAGE ROUTES ----------------

@app.route("/")
def customer_home():
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


# ---------------- EXPLORE FASHION ROUTES ----------------

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


# ---------------- SESSION CONFIGURATION ----------------

app.secret_key = os.getenv("FLASK_SECRET_KEY") or secrets.token_hex(32)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False
)

CORS(app, supports_credentials=True)


# ---------------- DATABASE CONNECTION ----------------

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


def convert_dates(record):
    """Convert MySQL date/time values into JSON-friendly strings."""
    if not record:
        return record

    for key, value in record.items():
        if isinstance(value, (date, time, datetime)):
            record[key] = value.isoformat()
        elif key == "estimated_price" and value is not None:
            record[key] = float(value)

    return record


# ---------------- TEST DATABASE ----------------

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
#                  CUSTOMER APIs
# ====================================================

# ---------------- CUSTOMER REGISTRATION ----------------

@app.route("/api/register", methods=["POST"])
def register_customer():
    data = request.get_json(silent=True) or {}

    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "error": "Please fill all the fields."
        }), 400

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
        return jsonify({
            "error": "Invalid password."
        }), 400

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
            return jsonify({
                "error": "Customer not found."
            }), 404

        for key, value in profile.items():
            if value is not None and key.endswith("_cm"):
                profile[key] = float(value)

        return jsonify(profile)

    except Exception:
        app.logger.exception("Loading customer profile failed")

        return jsonify({
            "error": "Could not load profile."
        }), 500

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
            return jsonify({
                "error": "Customer not found."
            }), 404

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
    """Save a customer's appointment request in the MySQL appointments table."""
    data = request.get_json(silent=True) or {}

    try:
        customer_id = int(data.get("customer_id"))
        appointment_date = datetime.strptime(
            str(data.get("date") or "").strip(),
            "%Y-%m-%d"
        ).date()
        appointment_time = datetime.strptime(
            str(data.get("time") or "").strip(),
            "%H:%M"
        ).time()
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
                customer_id,
                appointment_date,
                appointment_time,
                purpose,
                notes,
                status
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
    """Return appointments belonging to one customer."""
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id,
                customer_id,
                appointment_date,
                appointment_time,
                purpose,
                notes,
                status,
                created_at
            FROM appointments
            WHERE customer_id = %s
            ORDER BY appointment_date DESC, appointment_time DESC
        """, (customer_id,))

        appointments = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        return jsonify({
            "appointments": appointments
        })

    except Exception:
        app.logger.exception("Loading customer appointments failed")

        return jsonify({
            "error": "Could not load appointments. Check the Flask terminal."
        }), 500

    finally:
        close_db(cursor, connection)


# ====================================================
#                    ADMIN APIs
# ====================================================

# ---------------- ADMIN REGISTRATION ----------------

@app.route("/api/admin/register", methods=["POST"])
def register_admin():
    data = request.get_json(silent=True) or {}

    name = str(
        data.get("name") or data.get("full_name") or ""
    ).strip()

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "error": "Please fill all the fields."
        }), 400

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

        # Allow public registration only for the first admin.
        # Later registrations require an authenticated admin.
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


# ---------------- ADMIN LOGIN ----------------

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


# ---------------- CURRENT ADMIN ----------------

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

            return jsonify({
                "error": "Admin account not found."
            }), 404

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


# ---------------- ADMIN LOGOUT ----------------

@app.route("/api/logout", methods=["POST"])
def logout_admin():
    session.clear()

    return jsonify({
        "message": "Logged out successfully."
    })


# ---------------- ADMIN DASHBOARD DATA ----------------

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

        # Custom orders with customer names
        cursor.execute("""
            SELECT
                co.id,
                co.customer_id,
                c.name AS customer_name,
                co.outfit_type,
                co.colour,
                co.fabric,
                co.occasion,
                co.description,
                co.duration_days,
                co.payment_mode,
                co.estimated_price,
                co.status,
                co.created_at
            FROM custom_orders co
            LEFT JOIN customers c
                ON co.customer_id = c.id
            ORDER BY co.created_at DESC
        """)

        orders = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        # Appointments with customer names
        cursor.execute("""
            SELECT
                a.id,
                a.customer_id,
                c.name AS customer_name,
                c.email,
                a.appointment_date,
                a.appointment_time,
                a.purpose,
                a.notes,
                a.status,
                a.created_at
            FROM appointments a
            LEFT JOIN customers c
                ON a.customer_id = c.id
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        """)

        appointments = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        # Customer list and phone numbers
        cursor.execute("""
            SELECT
                c.id,
                c.name,
                c.email,
                m.phone,
                c.created_at
            FROM customers c
            LEFT JOIN measurements m
                ON c.id = m.customer_id
            ORDER BY c.created_at DESC
        """)

        customers = [
            convert_dates(row)
            for row in cursor.fetchall()
        ]

        total_customers = len(customers)
        total_appointments = len(appointments)
        total_orders = len(orders)

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
                "total_customers": total_customers,
                "total_appointments": total_appointments,
                "total_orders": total_orders,
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


# ---------------- UPDATE CUSTOM ORDER STATUS ----------------

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
        "In Progress",
        "Ready",
        "Completed",
        "Cancelled"
    ]

    if status not in allowed_statuses:
        return jsonify({
            "error": "Invalid order status."
        }), 400

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


# ---------------- UPDATE APPOINTMENT STATUS ----------------

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
        return jsonify({
            "error": "Invalid appointment status."
        }), 400

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


# ---------------- START FLASK SERVER ----------------

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )