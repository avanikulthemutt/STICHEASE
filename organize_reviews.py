from pathlib import Path

# CUSTOMER REVIEW DESIGN
customer_css = r"""

/* ==========================================
   STITCHEASE - CUSTOMER REVIEW DESIGN
========================================== */

.review-page {
    width: min(100% - 36px, 1050px);
    max-width: 1050px;
    margin: 0 auto;
    padding-bottom: 55px;
}

.review-page .back-link {
    margin-bottom: 22px;
}

.review-hero {
    padding: 30px 34px;
    margin-bottom: 26px;
    border-radius: 20px;
}

.review-hero h1 {
    margin: 9px 0;
    font-size: clamp(27px, 4vw, 36px);
}

.review-hero p {
    max-width: 540px;
    line-height: 1.7;
}

.review-form-card {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    padding: 34px;
    background: #FFFFFF;
    border: 1px solid #E6E0D3;
    border-radius: 20px;
    box-shadow: 0 12px 35px rgba(7, 27, 53, 0.06);
}

.review-form-card .orders-card-heading {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-bottom: 22px;
    margin-bottom: 25px;
    border-bottom: 1px solid #EEE9DF;
}

.review-form-card .orders-heading-icon {
    width: 52px;
    height: 52px;
    min-width: 52px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: #FFF4CC;
    color: #071B35;
}

.review-form-card .orders-card-heading h2 {
    margin: 5px 0;
    color: #071B35;
    font-size: 22px;
}

.review-form-card .orders-card-heading p {
    margin: 0;
    color: #687589;
    line-height: 1.6;
}

.review-form-card form {
    display: flex;
    flex-direction: column;
    gap: 19px;
}

.review-form-card .field {
    width: 100%;
    margin: 0;
}

.review-form-card .field label {
    display: block;
    margin-bottom: 9px;
    color: #071B35;
    font-weight: 700;
    font-size: 14px;
}

.review-form-card select,
.review-form-card textarea {
    width: 100%;
    padding: 14px 15px;
    border: 1px solid #DCD7CB;
    border-radius: 11px;
    background: #FFFEFB;
    color: #071B35;
    font: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.review-form-card select {
    min-height: 49px;
    cursor: pointer;
}

.review-form-card textarea {
    min-height: 145px;
    resize: vertical;
    line-height: 1.7;
}

.review-form-card select:focus,
.review-form-card textarea:focus {
    border-color: #D9A900;
    box-shadow: 0 0 0 3px rgba(255, 201, 40, 0.18);
}

.review-character-note {
    display: block;
    margin-top: 8px;
    color: #788294;
    font-size: 12px;
}

.review-form-card #submitReviewButton {
    min-height: 49px;
    margin-top: 3px;
    border-radius: 11px;
    font-weight: 700;
}

.review-form-card .message {
    min-height: 20px;
    margin: 0;
    text-align: center;
}

@media (max-width: 600px) {
    .review-page {
        width: min(100% - 24px, 1050px);
    }

    .review-hero {
        padding: 23px 20px;
    }

    .review-form-card {
        padding: 22px 18px;
    }

    .review-form-card .orders-card-heading {
        align-items: flex-start;
    }

    .review-form-card .orders-card-heading h2 {
        font-size: 19px;
    }
}
"""

# ADMIN REVIEW DESIGN
admin_css = r"""

/* ==========================================
   STITCHEASE - ADMIN REVIEWS DESIGN
========================================== */

#reviews {
    padding-bottom: 40px;
}

#reviews .page-heading {
    margin-bottom: 25px;
}

#reviews .page-heading h1 {
    color: #071B35;
    margin-bottom: 7px;
}

#reviews .page-heading p {
    color: #687589;
}

.review-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin: 24px 0 28px;
}

.review-stat-card {
    position: relative;
    min-height: 145px;
    padding: 25px 27px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 9px;
    background: #FFFFFF;
    border: 1px solid #E8E2D5;
    border-top: 4px solid #FFC928;
    border-radius: 15px;
    box-shadow: 0 5px 18px rgba(7, 27, 53, 0.04);
}

.review-stat-card span {
    color: #687589;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.review-stat-card strong {
    color: #071B35;
    font-size: 32px;
    line-height: 1.2;
    font-weight: 750;
}

.review-stat-card small {
    color: #7B8490;
    font-size: 12px;
}

#adminReviewStars {
    color: #D49A00;
    font-size: 19px;
    letter-spacing: 3px;
}

.admin-reviews-card {
    padding: 25px;
    overflow: hidden;
    background: #FFFFFF;
    border: 1px solid #E8E2D5;
    border-radius: 16px;
    box-shadow: 0 5px 18px rgba(7, 27, 53, 0.04);
}

.admin-reviews-card .section-heading {
    margin-bottom: 21px;
}

.admin-reviews-card .section-heading h2 {
    color: #071B35;
    font-size: 19px;
    margin-bottom: 5px;
}

.admin-reviews-card .section-heading p {
    color: #788294;
    font-size: 13px;
}

.admin-reviews-card .table-responsive {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #EEE9DF;
    border-radius: 11px;
}

.admin-reviews-table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
    background: #FFFFFF;
}

.admin-reviews-table th,
.admin-reviews-table td {
    padding: 17px 15px;
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid #EEE9DF;
    font-size: 13px;
}

.admin-reviews-table th {
    color: #071B35;
    background: #FFF8E5;
    font-size: 12px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    white-space: nowrap;
}

.admin-reviews-table tbody tr:last-child td {
    border-bottom: none;
}

.admin-reviews-table tbody tr:hover {
    background: #FFFEFA;
}

.admin-reviews-table td strong {
    color: #071B35;
    font-size: 13px;
}

.admin-reviews-table td small {
    display: inline-block;
    margin-top: 5px;
    color: #8490A0;
    font-size: 11px;
}

.admin-review-stars {
    color: #D49A00;
    font-size: 16px;
    letter-spacing: 1px;
    white-space: nowrap;
}

.admin-review-text {
    min-width: 220px;
    max-width: 390px;
    color: #52647A;
    line-height: 1.7;
    white-space: normal;
    overflow-wrap: anywhere;
}

.review-delete-button {
    padding: 9px 15px;
    border: 1px solid #F0D4D0;
    border-radius: 8px;
    background: #FFF5F3;
    color: #A83232;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
}

.review-delete-button:hover {
    background: #FCE7E3;
    border-color: #E7BDB7;
}

.admin-reviews-table .empty-state {
    padding: 35px 20px;
    color: #7B8490;
    text-align: center;
}

@media (max-width: 700px) {
    .review-stats-grid {
        grid-template-columns: 1fr;
        gap: 13px;
    }

    .review-stat-card {
        min-height: 125px;
        padding: 20px;
    }

    .admin-reviews-card {
        padding: 17px 12px;
    }
}
"""

def append_once(path, marker, content):
    file = Path(path)
    current = file.read_text()

    if marker in current:
        print(f"Already organized: {path}")
        return

    file.write_text(current.rstrip() + "\n\n" + marker + "\n" + content + "\n")
    print(f"Updated: {path}")

append_once(
    "style.css",
    "STITCHEASE - CUSTOMER REVIEW DESIGN",
    customer_css
)

admin_file = Path("admin.html")
admin_html = admin_file.read_text()
marker = "STITCHEASE - ADMIN REVIEWS DESIGN"

if marker not in admin_html:
    closing = admin_html.lower().rfind("</style>")
    if closing == -1:
        raise SystemExit("Could not find admin.html style closing tag.")

    admin_html = (
        admin_html[:closing]
        + "\n"
        + marker
        + "\n"
        + admin_css
        + "\n"
        + admin_html[closing:]
    )
    admin_file.write_text(admin_html)
    print("Updated: admin.html")
else:
    print("Already organized: admin.html")

print("\nBoth review sections have been organized.")
