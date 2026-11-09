
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from twilio.rest import Client

# Load environment variables
load_dotenv()

# Flask application
app = Flask(__name__)
CORS(app)


# -----------------------------------------
# DATABASE CONNECTION
# -----------------------------------------

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("STITCH_DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "stitchease")
        )
        return connection

    except Error as e:
        print("Database connection error:", e)
        return None


# -----------------------------------------
# TEST API
# -----------------------------------------

@app.route("/api/test", methods=["GET"])
def test_api():
    connection = get_db_connection()

    if connection:
        connection.close()
        return jsonify({
            "success": True,
            "message": "STITCHEASE backend connected successfully!"
        }), 200

    return jsonify({
        "success": False,
        "message": "Database connection failed"
    }), 500


# -----------------------------------------
# CUSTOMER REGISTRATION
# -----------------------------------------

@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "Please provide name, email and password"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "message": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id FROM customers WHERE email = %s",
            (email,)
        )

        existing_customer = cursor.fetchone()

        if existing_customer:
            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409

        password_hash = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO customers (name, email, password_hash)
            VALUES (%s, %s, %s)
            """,
            (name, email, password_hash)
        )

        connection.commit()

        customer_id = cursor.lastrowid

        return jsonify({
            "success": True,
            "message": "Registration successful",
            "customer_id": customer_id
        }), 201

    except Error as e:
        connection.rollback()
        print("Registration error:", e)

        return jsonify({
            "success": False,
            "message": "Registration failed"
        }), 500

    finally:
        cursor.close()
        connection.close()


# -----------------------------------------
# CUSTOMER LOGIN
# -----------------------------------------

@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required"
        }), 400

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "message": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, name, email, password_hash
            FROM customers
            WHERE email = %s
            """,
            (email,)
        )

        customer = cursor.fetchone()

        if not customer:
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        if not check_password_hash(
            customer["password_hash"], password
        ):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        return jsonify({
            "success": True,
            "message": "Login successful",
            "customer": {
                "id": customer["id"],
                "name": customer["name"],
                "email": customer["email"]
            }
        }), 200

    except Error as e:
        print("Login error:", e)

        return jsonify({
            "success": False,
            "message": "Login failed"
        }), 500

    finally:
        cursor.close()
        connection.close()


# -----------------------------------------
# CUSTOMER PROFILE
# -----------------------------------------

@app.route("/api/profile/<int:customer_id>", methods=["GET", "POST"])
def profile(customer_id):

    connection = get_db_connection()

    if not connection:
        return jsonify({
            "success": False,
            "message": "Database connection failed"
        }), 500

    cursor = connection.cursor(dictionary=True)

    try:

        if request.method == "GET":

            cursor.execute(
                """
                SELECT id, name, email
                FROM customers
                WHERE id = %s
                """,
                (customer_id,)
            )

            customer = cursor.fetchone()

            if not customer:
                return jsonify({
                    "success": False,
                    "message": "Customer not found"
                }), 404

            cursor.execute(
                """
                SELECT customer_id, phone, address,
                       height_cm, shoulder_cm, bust_cm,
                       waist_cm, hip_cm, sleeve_cm,
                       dress_length_cm
                FROM measurements
                WHERE customer_id = %s
                """,
                (customer_id,)
            )

            measurements = cursor.fetchone()

            return jsonify({
                "success": True,
                "customer": customer,
                "measurements": measurements
            }), 200

        if request.method == "POST":

            data = request.get_json(silent=True) or {}

            fields = [
                "phone",
                "address",
                "height_cm",
                "shoulder_cm",
                "bust_cm",
                "waist_cm",
                "hip_cm",
                "sleeve_cm",
                "dress_length_cm"
            ]

            values = [data.get(field) for field in fields]

            cursor.execute(
                "SELECT customer_id FROM measurements WHERE customer_id = %s",
                (customer_id,)
            )

            existing = cursor.fetchone()

            if existing:

                cursor.execute(
                    """
                    UPDATE measurements
                    SET phone = %s,
                        address = %s,
                        height_cm = %s,
                        shoulder_cm = %s,
                        bust_cm = %s,
                        waist_cm = %s,
                        hip_cm = %s,
                        sleeve_cm = %s,
                        dress_length_cm = %s
                    WHERE customer_id = %s
                    """,
                    tuple(values) + (customer_id,)
                )

            else:

                cursor.execute(
                    """
                    INSERT INTO measurements
                    (customer_id, phone, address, height_cm,
                     shoulder_cm, bust_cm, waist_cm, hip_cm,
                     sleeve_cm, dress_length_cm)
                    VALUES (%s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s)
                    """,
                    (customer_id,) + tuple(values)
                )

            connection.commit()

            return jsonify({
                "success": True,
                "message": "Profile updated successfully"
            }), 200

    except Error as e:
        connection.rollback()
        print("Profile error:", e)

        return jsonify({
            "success": False,
            "message": "Profile operation failed"
        }), 500

    finally:
        cursor.close()
        connection.close()


# -----------------------------------------
# WHATSAPP ORDER NOTIFICATION
# -----------------------------------------

@app.route("/api/send-whatsapp", methods=["POST"])
def send_whatsapp():

    data = request.get_json(silent=True) or {}

    phone = data.get("phone")
    name = data.get("name", "Customer")
    order_id = data.get("order_id", "N/A")
    outfit = data.get("outfit", "Custom Outfit")
    status = data.get("status", "Placed")

    if not phone:
        return jsonify({
            "success": False,
            "message": "Customer phone number is required"
        }), 400

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER")

    if not account_sid or not auth_token or not whatsapp_number:
        return jsonify({
            "success": False,
            "message": "Twilio configuration is missing"
        }), 500

    try:

        client = Client(account_sid, auth_token)

        # Format customer WhatsApp number
        phone = phone.strip()

        if phone.startswith("whatsapp:"):
            to_number = phone
        else:
            if not phone.startswith("+"):
                phone = "+91" + phone

            to_number = "whatsapp:" + phone

        from_number = whatsapp_number.strip()

        if not from_number.startswith("whatsapp:"):
            from_number = "whatsapp:" + from_number

        message_body = f"""
Hello {name}! 

Thank you for choosing STITCHEASE!

Your custom outfit order has been received successfully.

Order ID: {order_id}
Outfit: {outfit}
Order Status: {status}

Our boutique team will keep you updated about your order.

Thank you for trusting STITCHEASE!
        """

        message = client.messages.create(
            body=message_body,
            from_=from_number,
            to=to_number
        )

        return jsonify({
            "success": True,
            "message": "WhatsApp notification sent successfully",
            "message_sid": message.sid
        }), 200

    except Exception as e:

        print("WhatsApp error:", e)

        return jsonify({
            "success": False,
            "message": "Unable to send WhatsApp notification",
            "error": str(e)
        }), 500


# -----------------------------------------
# RUN APPLICATION
# -----------------------------------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
