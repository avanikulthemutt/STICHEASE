from pathlib import Path
import shutil
import re

html_path = Path("admin.html")
js_path = Path("admin.js")

html = html_path.read_text()
js = js_path.read_text()

# Create backups
shutil.copy2(html_path, "admin.html.before-payment-format")
shutil.copy2(js_path, "admin.js.before-payment-format")

# ---------------- PAYMENTS HTML ----------------

start = html.find('<section id="payments"')
end = html.find('<!-- REVIEWS -->', start)

if start == -1 or end == -1:
    raise SystemExit("Could not locate the Payments section.")

new_section = '''
                <section id="payments" class="admin-page page-content" hidden>

                    <div class="page-heading">
                        <div>
                            <span class="eyebrow">BUSINESS OVERVIEW</span>
                            <h1>Payments</h1>
                            <p>Track order amounts, payment methods and payment status.</p>
                        </div>
                    </div>

                    <div class="payment-summary-grid">

                        <div class="payment-summary-card">
                            <div class="payment-card-icon">
                                <i data-lucide="receipt"></i>
                            </div>
                            <div>
                                <p>Total Orders</p>
                                <h2 id="paymentTotalOrders">0</h2>
                                <span>Orders received</span>
                            </div>
                        </div>

                        <div class="payment-summary-card">
                            <div class="payment-card-icon">
                                <i data-lucide="wallet"></i>
                            </div>
                            <div>
                                <p>Total Order Value</p>
                                <h2 id="paymentTotalAmount">₹0.00</h2>
                                <span>Value of all orders</span>
                            </div>
                        </div>

                        <div class="payment-summary-card">
                            <div class="payment-card-icon paid-icon">
                                <i data-lucide="badge-check"></i>
                            </div>
                            <div>
                                <p>Marked as Paid</p>
                                <h2 id="paymentPaidAmount">₹0.00</h2>
                                <span>Payments confirmed</span>
                            </div>
                        </div>

                        <div class="payment-summary-card">
                            <div class="payment-card-icon pending-icon">
                                <i data-lucide="clock"></i>
                            </div>
                            <div>
                                <p>Pending Payments</p>
                                <h2 id="paymentPendingAmount">₹0.00</h2>
                                <span>Awaiting confirmation</span>
                            </div>
                        </div>

                    </div>

                    <div class="content-card payment-records-card">

                        <div class="payment-records-heading">
                            <div>
                                <span class="eyebrow">PAYMENT MANAGEMENT</span>
                                <h2>Order Payment Records</h2>
                                <p>Review customer payments and update their status.</p>
                            </div>

                            <div class="payment-records-count">
                                <i data-lucide="file-text"></i>
                                <span>Order Records</span>
                            </div>
                        </div>

                        <div class="payments-table-container">
                            <table class="payments-table">
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
                                        <td colspan="7" class="empty-state">
                                            Loading payment records...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="payment-information">
                            <i data-lucide="info"></i>
                            <p>
                                Payment statuses are maintained manually by the boutique.
                                No online payment is processed here.
                            </p>
                        </div>

                    </div>

                </section>


                '''

html = html[:start] + new_section + html[end:]

# ---------------- PAYMENT CSS ----------------

payment_css = """

/* =========================================
   STITCHEASE - PAYMENTS PAGE
   Ivory Cream and Warm Yellow Theme
========================================= */

.payment-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 20px;
    margin: 26px 0;
}

.payment-summary-card {
    background: #fffdf7;
    border: 1px solid #eee8d9;
    border-radius: 15px;
    padding: 23px 21px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    min-width: 0;
    box-shadow: 0 3px 12px rgba(45, 39, 20, 0.035);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.payment-summary-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 7px 18px rgba(45, 39, 20, 0.07);
}

.payment-card-icon {
    width: 46px;
    height: 46px;
    min-width: 46px;
    border-radius: 12px;
    background: #fff0b8;
    color: #755700;
    display: flex;
    align-items: center;
    justify-content: center;
}

.payment-card-icon svg {
    width: 22px;
    height: 22px;
}

.payment-card-icon.paid-icon {
    background: #e5f3e7;
    color: #267347;
}

.payment-card-icon.pending-icon {
    background: #fff0d7;
    color: #a66b13;
}

.payment-summary-card p {
    color: #777064;
    font-size: 13px;
    font-weight: 600;
    margin: 2px 0 9px;
}

.payment-summary-card h2 {
    color: #29271f;
    font-size: 25px;
    font-weight: 700;
    line-height: 1.25;
    margin: 0 0 7px;
    overflow-wrap: anywhere;
}

.payment-summary-card span {
    color: #969084;
    font-size: 11px;
}

.payment-records-card {
    margin-top: 28px;
    overflow: hidden;
}

.payment-records-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    padding: 24px 25px;
    border-bottom: 1px solid #eee9df;
}

.payment-records-heading h2 {
    color: #29271f;
    font-size: 20px;
    margin: 7px 0;
}

.payment-records-heading p {
    color: #827c70;
    font-size: 13px;
    margin: 0;
}

.payment-records-count {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: #fff6d9;
    border: 1px solid #f3e5b5;
    color: #735814;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.payment-records-count svg {
    width: 16px;
    height: 16px;
}

.payments-table-container {
    width: 100%;
    overflow-x: auto;
    padding: 0 20px;
}

.payments-table {
    width: 100%;
    min-width: 940px;
    border-collapse: separate;
    border-spacing: 0;
}

.payments-table thead th {
    background: #fffaf0;
    color: #777064;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.045em;
    padding: 17px 15px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid #eee8dc;
}

.payments-table tbody td {
    color: #464238;
    font-size: 13px;
    padding: 19px 15px;
    border-bottom: 1px solid #f0ede6;
    white-space: nowrap;
    vertical-align: middle;
}

.payments-table tbody tr:last-child td {
    border-bottom: none;
}

.payments-table tbody tr:hover {
    background: #fffdf8;
}

.payments-table tbody td:first-child {
    color: #665019;
    font-weight: 700;
}

.payments-table .payment-status-select {
    width: 155px;
    min-width: 155px;
    padding: 10px 30px 10px 12px;
    border: 1px solid #e6dfcf;
    border-radius: 8px;
    background-color: #fffdf7;
    color: #39352c;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.payments-table .payment-status-select:focus {
    border-color: #d8ad32;
    box-shadow: 0 0 0 3px rgba(245, 197, 66, 0.18);
}

.payments-table .payment-status-select:hover {
    border-color: #d8ad32;
}

.payment-information {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 16px 25px 22px;
    padding: 14px 16px;
    background: #fff9e9;
    border: 1px solid #f1e5c5;
    border-radius: 9px;
    color: #796633;
}

.payment-information svg {
    width: 17px;
    height: 17px;
    min-width: 17px;
    margin-top: 1px;
}

.payment-information p {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
}

@media (max-width: 1100px) {
    .payment-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 600px) {
    .payment-summary-grid {
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .payment-summary-card {
        padding: 18px;
    }

    .payment-summary-card h2 {
        font-size: 22px;
    }

    .payment-records-heading {
        align-items: flex-start;
        flex-direction: column;
        padding: 20px;
    }

    .payments-table-container {
        padding: 0 12px;
    }

    .payment-information {
        margin: 14px 15px 18px;
    }
}

"""

style_position = html.rfind("</style>")

if style_position == -1:
    raise SystemExit("Could not find the closing style tag in admin.html.")

html = html[:style_position] + payment_css + "\n" + html[style_position:]

# ---------------- PAYMENT JAVASCRIPT ----------------

old_select = '''style="padding:8px;border:1px solid #DCE3EC;border-radius:7px;"'''

if old_select not in js:
    raise SystemExit("Could not find the existing payment dropdown style.")

js = js.replace(
    old_select,
    '''class="payment-status-select"''',
    1
)

# Save files
html_path.write_text(html)
js_path.write_text(js)

print("Payments page redesign completed successfully.")
print("Backups created:")
print("  admin.html.before-payment-format")
print("  admin.js.before-payment-format")
