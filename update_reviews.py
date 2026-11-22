from pathlib import Path
import re

def read(name):
    return Path(name).read_text(encoding="utf-8")

def write(name, content):
    Path(name).write_text(content, encoding="utf-8")
    print("Updated:", name)

def replace_once(content, old, new, filename):
    count = content.count(old)
    if count != 1:
        raise SystemExit(
            f"STOP: Expected one matching insertion point in {filename}, found {count}. No further changes made to that file."
        )
    return content.replace(old, new, 1)


# =========================================================
# 1. BACKEND: MYSQL TABLE AND REVIEW API
# =========================================================

app = read("app.py")

review_backend = '''

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

'''

app = replace_once(
    app,
    '# ====================================================\n#                    START FLASK SERVER',
    review_backend + '\n# ====================================================\n#                    START FLASK SERVER',
    "app.py"
)

# Create table during admin dashboard loading.
app = replace_once(
    app,
    '        cursor = connection.cursor(dictionary=True)\n\n        # Add payment tracking column safely',
    '        cursor = connection.cursor(dictionary=True)\n\n        ensure_reviews_table(cursor)\n\n        # Add payment tracking column safely',
    "app.py"
)

# Fetch reviews for the admin dashboard.
app = replace_once(
    app,
    '        pending_orders = sum(\n',
    '''        cursor.execute("""
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
''',
    "app.py"
)

app = replace_once(
    app,
    '                "customers": customers,\n                "total_customers": len(customers),',
    '                "customers": customers,\n                "reviews": reviews,\n                "total_reviews": len(reviews),\n                "average_rating": average_rating,\n                "total_customers": len(customers),',
    "app.py"
)

write("app.py", app)


# =========================================================
# 2. CUSTOMER HTML: DASHBOARD CARD AND REVIEW PAGE
# =========================================================

html = read("index.html")

review_card = '''
                <button class="feature-card" onclick="openReviews()">
                    <span class="feature-icon"><i data-lucide="star"></i></span>
                    <span class="feature-title">Share Feedback</span>
                    <span class="feature-description">Tell us about your Stitchease experience and help us improve.</span>
                    <span class="feature-link">Write a review <i data-lucide="arrow-up-right"></i></span>
                </button>
'''

html = replace_once(
    html,
    '            </div>\n\n            <div class="dashboard-bottom">',
    review_card + '            </div>\n\n            <div class="dashboard-bottom">',
    "index.html"
)

review_page = '''
    <!-- CUSTOMER REVIEWS -->
    <section id="reviewSection" class="page" hidden>
        <header class="app-header">
            <a class="brand" href="#" onclick="showHome(); return false;">
                <span class="brand-icon"><i data-lucide="scissors"></i></span>
                <span><strong>Stitchease</strong><small>Your Style, Your Way</small></span>
            </a>
            <button class="dashboard-bar" onclick="showHome()">
                <i data-lucide="layout-dashboard"></i>
                <span>Back to Home</span>
            </button>
            <button class="btn btn-outline btn-small" onclick="logout()">Logout</button>
        </header>

        <main class="content-main review-page">
            <button class="back-link" onclick="showHome()">
                <i data-lucide="arrow-left"></i> Back to Home
            </button>

            <div class="orders-hero review-hero">
                <div>
                    <span class="eyebrow">YOUR EXPERIENCE MATTERS</span>
                    <h1>Share Your Feedback</h1>
                    <p>Your thoughts help us make every Stitchease experience better.</p>
                </div>
                <div class="orders-hero-icon"><i data-lucide="heart-handshake"></i></div>
            </div>

            <section class="form-card review-form-card">
                <div class="orders-card-heading">
                    <div class="orders-heading-icon"><i data-lucide="star"></i></div>
                    <div>
                        <span class="eyebrow">CUSTOMER FEEDBACK</span>
                        <h2>How was your experience?</h2>
                        <p>Rate our service and share your experience with us.</p>
                    </div>
                </div>

                <form id="customerReviewForm" onsubmit="event.preventDefault(); submitCustomerReview();">
                    <div class="field">
                        <label for="customerReviewRating">Your rating</label>
                        <select id="customerReviewRating" required>
                            <option value="">Choose your rating</option>
                            <option value="5">★★★★★ - Excellent</option>
                            <option value="4">★★★★☆ - Very good</option>
                            <option value="3">★★★☆☆ - Good</option>
                            <option value="2">★★☆☆☆ - Fair</option>
                            <option value="1">★☆☆☆☆ - Needs improvement</option>
                        </select>
                    </div>

                    <div class="field">
                        <label for="customerReviewText">Your feedback</label>
                        <textarea id="customerReviewText" rows="5" maxlength="1000"
                            placeholder="Tell us about the service, fitting, quality or your overall experience..."
                            required></textarea>
                        <small class="review-character-note">Maximum 1000 characters.</small>
                    </div>

                    <button type="submit" class="btn btn-primary btn-full" id="submitReviewButton">
                        <i data-lucide="send"></i> Submit Review
                    </button>
                    <p id="customerReviewMessage" class="message" role="status"></p>
                </form>
            </section>
        </main>
    </section>

'''

html = replace_once(
    html,
    '    <!-- BOUTIQUE ADMIN LOGIN -->',
    review_page + '    <!-- BOUTIQUE ADMIN LOGIN -->',
    "index.html"
)

write("index.html", html)


# =========================================================
# 3. CUSTOMER JAVASCRIPT
# =========================================================

js = read("script.js")

js = replace_once(
    js,
    '    "ordersSection",\n    "boutiqueLogin"',
    '    "ordersSection",\n    "reviewSection",\n    "boutiqueLogin"',
    "script.js"
)

customer_review_js = '''

/* ---------------- CUSTOMER REVIEWS ---------------- */

function openReviews() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    document.getElementById("customerReviewForm").reset();
    clearMessage("customerReviewMessage");
    showPage("reviewSection");
}

async function submitCustomerReview() {
    if (!currentCustomer || !currentCustomer.id) {
        showMessage(
            "customerReviewMessage",
            "Please log in again before submitting a review.",
            "error"
        );
        return;
    }

    const rating = document.getElementById("customerReviewRating").value;
    const reviewText = document.getElementById("customerReviewText").value.trim();
    const button = document.getElementById("submitReviewButton");

    if (!rating || !reviewText) {
        showMessage(
            "customerReviewMessage",
            "Please select a rating and write your feedback.",
            "error"
        );
        return;
    }

    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const data = await apiRequest("/api/reviews", {
            method: "POST",
            body: JSON.stringify({
                customer_id: currentCustomer.id,
                rating: Number(rating),
                review_text: reviewText
            })
        });

        document.getElementById("customerReviewForm").reset();

        showMessage(
            "customerReviewMessage",
            data.message || "Thank you for sharing your feedback!",
            "success"
        );

    } catch (error) {
        showMessage("customerReviewMessage", error.message, "error");

    } finally {
        button.disabled = false;
        button.innerHTML = '<i data-lucide="send"></i> Submit Review';
        refreshIcons();
    }
}

'''

js = replace_once(
    js,
    '// ---------------- LOGOUT AND SESSION RESTORE ----------------',
    customer_review_js + '// ---------------- LOGOUT AND SESSION RESTORE ----------------',
    "script.js"
)

write("script.js", js)


# =========================================================
# 4. CUSTOMER CSS
# =========================================================

css = read("style.css")

css += '''

/* =====================================================
   CUSTOMER REVIEWS
===================================================== */

.review-page {
    max-width: 1100px;
    margin: 0 auto;
}

.review-hero {
    margin-bottom: 28px;
}

.review-form-card {
    max-width: 760px;
    margin: 0 auto;
    padding: 30px;
    background: #FFFFFF;
    border: 1px solid #E5DFD2;
    border-radius: 18px;
}

.review-form-card textarea {
    width: 100%;
    resize: vertical;
}

.review-character-note {
    display: block;
    margin-top: 7px;
    color: #687589;
    font-size: 12px;
}

.review-form-card .message {
    margin-top: 14px;
}

@media (max-width: 600px) {
    .review-form-card {
        padding: 20px;
    }
}

'''

write("style.css", css)


# =========================================================
# 5. ADMIN HTML: REPLACE REVIEWS PLACEHOLDER
# =========================================================

admin_html = read("admin.html")

new_admin_reviews = '''
                <!-- REVIEWS -->
                <section id="reviews" class="admin-page page-content" hidden>
                    <div class="page-heading">
                        <div>
                            <span class="eyebrow">CUSTOMER FEEDBACK</span>
                            <h1>Reviews</h1>
                            <p>Read and manage feedback shared by your customers.</p>
                        </div>
                    </div>

                    <div class="review-stats-grid">
                        <div class="review-stat-card">
                            <span>Total Reviews</span>
                            <strong id="adminReviewCount">0</strong>
                            <small>Customer feedback received</small>
                        </div>
                        <div class="review-stat-card">
                            <span>Average Rating</span>
                            <strong id="adminAverageRating">0.0 / 5</strong>
                            <small id="adminReviewStars">☆☆☆☆☆</small>
                        </div>
                    </div>

                    <div class="content-card admin-reviews-card">
                        <div class="section-heading">
                            <div>
                                <h2>Customer Feedback</h2>
                                <p>Reviews submitted through the customer website.</p>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="admin-reviews-table">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Rating</th>
                                        <th>Review</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="adminReviewsTable">
                                    <tr><td colspan="5" class="empty-state">No reviews available yet.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
'''

pattern = re.compile(
    r'                <!-- REVIEWS -->.*?(?=                <!-- OFFERS -->)',
    re.S
)
admin_html, count = pattern.subn(new_admin_reviews, admin_html, count=1)

if count != 1:
    raise SystemExit("STOP: Could not safely locate the Reviews section in admin.html.")

admin_html = admin_html.replace(
    '</style>',
    '''
/* Customer Reviews */
.review-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin: 24px 0;
}
.review-stat-card {
    padding: 24px;
    border: 1px solid #E8DFC9;
    border-radius: 14px;
    background: #FFFDF6;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.review-stat-card span {
    color: #52647A;
    font-size: 14px;
}
.review-stat-card strong {
    color: #071B35;
    font-size: 30px;
}
.review-stat-card small {
    color: #7B8490;
}
.admin-reviews-card {
    overflow: hidden;
}
.admin-reviews-table {
    width: 100%;
    border-collapse: collapse;
}
.admin-reviews-table th,
.admin-reviews-table td {
    padding: 15px 13px;
    text-align: left;
    border-bottom: 1px solid #EEE8DC;
    vertical-align: top;
}
.admin-reviews-table th {
    color: #071B35;
    background: #FFF8E5;
    font-weight: 700;
}
.admin-review-stars {
    color: #D49A00;
    white-space: nowrap;
    letter-spacing: 1px;
}
.admin-review-text {
    min-width: 220px;
    max-width: 440px;
    white-space: normal;
    overflow-wrap: anywhere;
    color: #52647A;
}
.review-delete-button {
    border: 1px solid #E6CACA;
    border-radius: 8px;
    padding: 8px 12px;
    background: #FFF4F2;
    color: #A83232;
    cursor: pointer;
    font-weight: 600;
}
.review-delete-button:hover {
    background: #FCE4E0;
}
@media (max-width: 700px) {
    .review-stats-grid {
        grid-template-columns: 1fr;
    }
}
</style>''',
    1
)

write("admin.html", admin_html)


# =========================================================
# 6. ADMIN JAVASCRIPT
# =========================================================

admin_js = read("admin.js")

admin_js = replace_once(
    admin_js,
    '    customers: []\n};',
    '    customers: [],\n    reviews: []\n};',
    "admin.js"
)

admin_js = replace_once(
    admin_js,
    '        dashboardData.customers =\n            source.customers || [];\n\n        updateStatistics(source);',
    '        dashboardData.customers =\n            source.customers || [];\n\n        dashboardData.reviews =\n            source.reviews || [];\n\n        updateStatistics(source);',
    "admin.js"
)

admin_js = replace_once(
    admin_js,
    '        renderPayments();\n\n    } catch (error) {',
    '        renderPayments();\n        renderReviews(source);\n\n    } catch (error) {',
    "admin.js"
)

admin_review_js = '''

/* ---------------- CUSTOMER REVIEWS ---------------- */

function renderReviews(source = {}) {
    const table = document.getElementById("adminReviewsTable");
    if (!table) return;

    const reviews = dashboardData.reviews || [];
    const average = Number(source.average_rating || 0);

    setText("adminReviewCount", source.total_reviews ?? reviews.length);
    setText("adminAverageRating", average.toFixed(1) + " / 5");

    const rounded = Math.round(average);
    setText(
        "adminReviewStars",
        "★".repeat(rounded) + "☆".repeat(5 - rounded)
    );

    if (!reviews.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No customer reviews have been submitted yet.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = reviews.map(review => {
        const id = Number(getValue(review, "id"));
        const rating = Math.max(0, Math.min(5, Number(getValue(review, "rating")) || 0));
        const dateValue = getValue(review, "created_at") || "—";

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(getValue(review, "customer_name") || "Customer")}</strong>
                    <br>
                    <small>${escapeHTML(getValue(review, "email") || "")}</small>
                </td>
                <td>
                    <span class="admin-review-stars">
                        ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
                    </span>
                    <br>
                    <small>${rating} / 5</small>
                </td>
                <td><div class="admin-review-text">${escapeHTML(getValue(review, "review_text"))}</div></td>
                <td>${escapeHTML(dateValue)}</td>
                <td>
                    <button class="review-delete-button"
                        onclick="deleteCustomerReview(${id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

async function deleteCustomerReview(reviewId) {
    if (!Number.isInteger(reviewId) || reviewId < 1) return;

    if (!confirm("Are you sure you want to delete this customer review?")) {
        return;
    }

    try {
        await apiRequest(
            `/api/admin/reviews/${reviewId}`,
            { method: "DELETE" }
        );

        await loadDashboard();
        alert("Review deleted successfully.");

    } catch (error) {
        alert(error.message);
    }
}

'''

admin_js = replace_once(
    admin_js,
    '// ---------------- LOGOUT ----------------',
    admin_review_js + '// ---------------- LOGOUT ----------------',
    "admin.js"
)

admin_js = replace_once(
    admin_js,
    '        customers: []\n    };\n\n    document.getElementById("dashboardSection")',
    '        customers: [],\n        reviews: []\n    };\n\n    document.getElementById("dashboardSection")',
    "admin.js"
)

write("admin.js", admin_js)

print("\\nReview feature code has been added.")
