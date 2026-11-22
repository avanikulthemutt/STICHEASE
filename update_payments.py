from pathlib import Path
import shutil

app_path = Path("app.py")
js_path = Path("admin.js")
html_path = Path("admin.html")

app = app_path.read_text()
js = js_path.read_text()
html = html_path.read_text()

# ---------------- BACKUP ----------------

for path in (app_path, js_path, html_path):
    shutil.copy2(path, str(path) + ".payments-backup")

# ---------------- APP.PY: PAYMENT COLUMN ----------------

dashboard_marker = '''        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                co.id, co.customer_id, c.name AS customer_name,
                co.outfit_type, co.colour, co.fabric, co.occasion,
                co.description, co.duration_days, co.payment_mode,
                co.estimated_price, co.status, co.created_at
'''

dashboard_replacement = '''        cursor = connection.cursor(dictionary=True)

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
'''

if dashboard_marker not in app:
    raise SystemExit("Could not find the dashboard query in app.py. No files were changed.")

app = app.replace(dashboard_marker, dashboard_replacement, 1)

# ---------------- APP.PY: PAYMENT UPDATE API ----------------

payment_api = '''

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


'''

order_api_marker = '''# ====================================================
#                 ADMIN ORDER MANAGEMENT
# ====================================================
'''

if order_api_marker not in app:
    raise SystemExit("Could not find the admin order management section in app.py.")

app = app.replace(order_api_marker, payment_api + order_api_marker, 1)

# ---------------- ADMIN.JS: LOAD PAYMENT DATA ----------------

load_marker = '''        renderOrders();
        renderAppointments();
        renderCustomers();
'''

load_replacement = '''        renderOrders();
        renderAppointments();
        renderCustomers();
        renderPayments();
'''

if load_marker not in js:
    raise SystemExit("Could not find dashboard rendering section in admin.js.")

js = js.replace(load_marker, load_replacement, 1)

# ---------------- ADMIN.JS: PAYMENT FUNCTIONS ----------------

payment_js = r'''

// ---------------- PAYMENT MANAGEMENT ----------------

function formatRupees(amount) {
    const value = Number(amount || 0);

    return "₹" + value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function renderPayments() {
    const table = document.getElementById("paymentsTable");

    if (!table) return;

    const orders = dashboardData.orders || [];

    const paidOrders = orders.filter(order =>
        String(getValue(order, "payment_status") || "Pending").toLowerCase() === "paid"
    );

    const pendingOrders = orders.filter(order =>
        String(getValue(order, "payment_status") || "Pending").toLowerCase() === "pending"
    );

    const paidTotal = paidOrders.reduce((sum, order) =>
        sum + Number(getValue(order, "estimated_price") || 0), 0
    );

    const pendingTotal = pendingOrders.reduce((sum, order) =>
        sum + Number(getValue(order, "estimated_price") || 0), 0
    );

    const allTotal = orders.reduce((sum, order) =>
        sum + Number(getValue(order, "estimated_price") || 0), 0
    );

    setText("paymentTotalOrders", orders.length);
    setText("paymentTotalAmount", formatRupees(allTotal));
    setText("paymentPaidAmount", formatRupees(paidTotal));
    setText("paymentPendingAmount", formatRupees(pendingTotal));

    if (!orders.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No order payment records available yet.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = orders.map(order => {
        const id = getValue(order, "id", "order_id");
        const status = getValue(order, "payment_status") || "Pending";

        return `
            <tr>
                <td>#${escapeHTML(id)}</td>
                <td>${escapeHTML(getValue(order, "customer_name", "name") || "Customer")}</td>
                <td>${escapeHTML(getValue(order, "outfit_type", "outfit") || "—")}</td>
                <td>${escapeHTML(getValue(order, "payment_mode") || "Not specified")}</td>
                <td>${formatRupees(getValue(order, "estimated_price"))}</td>
                <td>
                    <span class="status ${getStatusClass(status)}">
                        ${escapeHTML(status)}
                    </span>
                </td>
                <td>
                    <select
                        onchange="updatePaymentStatus('${escapeHTML(id)}', this.value)"
                        aria-label="Update payment status for order ${escapeHTML(id)}"
                        style="padding:8px;border:1px solid #DCE3EC;border-radius:7px;"
                    >
                        ${["Pending", "Paid", "Partially Paid", "Refunded"].map(option => `
                            <option value="${option}"
                                ${status.toLowerCase() === option.toLowerCase() ? "selected" : ""}>
                                ${option}
                            </option>
                        `).join("")}
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}

async function updatePaymentStatus(orderId, paymentStatus) {
    try {
        await apiRequest(
            `/api/admin/payments/${encodeURIComponent(orderId)}`,
            {
                method: "PATCH",
                body: JSON.stringify({ payment_status: paymentStatus })
            }
        );

        alert("Payment status updated successfully.");
        await loadDashboard();

    } catch (error) {
        alert(error.message);
        await loadDashboard();
    }
}

'''

logout_marker = '''// ---------------- LOGOUT ----------------
'''

if logout_marker not in js:
    raise SystemExit("Could not find logout section in admin.js.")

js = js.replace(logout_marker, payment_js + logout_marker, 1)

# ---------------- ADMIN.HTML: PAYMENT PAGE ----------------

old_payment_html = '''                <!-- PAYMENTS -->

                <section id="payments" class="admin-page page-content" hidden>
                    <div class="page-heading">
                        <div>
                            <span class="eyebrow">BUSINESS OVERVIEW</span>
                            <h1>Payments</h1>
                            <p>Review payment information for boutique orders.</p>
                        </div>
                    </div>
                    <div class="section-placeholder">
                        <div class="placeholder-icon"><i data-lucide="wallet"></i></div>
                        <h2>Payment Management</h2>
                        <p>Payment management can be connected when payment processing is introduced.</p>
                    </div>
                </section>
'''

new_payment_html = '''                <!-- PAYMENTS -->

                <section id="payments" class="admin-page page-content" hidden>
                    <div class="page-heading">
                        <div>
                            <span class="eyebrow">BUSINESS OVERVIEW</span>
                            <h1>Payments</h1>
                            <p>Track order amounts, payment methods and payment status.</p>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon"><i data-lucide="receipt"></i></div>
                            <div>
                                <p>Total Orders</p>
                                <h2 id="paymentTotalOrders">0</h2>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon"><i data-lucide="wallet"></i></div>
                            <div>
                                <p>Total Order Value</p>
                                <h2 id="paymentTotalAmount">₹0.00</h2>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon"><i data-lucide="badge-check"></i></div>
                            <div>
                                <p>Marked as Paid</p>
                                <h2 id="paymentPaidAmount">₹0.00</h2>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon"><i data-lucide="clock"></i></div>
                            <div>
                                <p>Pending Payments</p>
                                <h2 id="paymentPendingAmount">₹0.00</h2>
                            </div>
                        </div>
                    </div>

                    <div class="content-card">
                        <div class="section-header">
                            <div>
                                <h2>Order Payment Records</h2>
                                <p>Update the payment status after confirming payment with the customer.</p>
                            </div>
                        </div>

                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Outfit</th>
                                        <th>Payment Method</th>
                                        <th>Amount</th>
                                        <th>Payment Status</th>
                                        <th>Update Status</th>
                                    </tr>
                                </thead>
                                <tbody id="paymentsTable">
                                    <tr>
                                        <td colspan="7" class="empty-state">Loading payment records...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <p class="small-note">
                        Payment statuses are maintained manually by the boutique. No online payment is processed here.
                    </p>
                </section>
'''

if old_payment_html not in html:
    raise SystemExit("Could not find the original Payments section in admin.html.")

html = html.replace(old_payment_html, new_payment_html, 1)

# ---------------- SAVE ALL FILES ----------------

app_path.write_text(app)
js_path.write_text(js)
html_path.write_text(html)

print("Payments module updated successfully.")
print("Backups created:")
print("  app.py.payments-backup")
print("  admin.js.payments-backup")
print("  admin.html.payments-backup")
