
const API_BASE = "";

let currentAdmin = null;
let measurementRecords = [];

let dashboardData = {
    appointments: [],
    orders: [],
    customers: [],
    reviews: []
};

const ORDER_STATUSES = [
    "Placed",
    "Confirmed",
    "Measured",
    "In Progress",
    "Trial",
    "Ready",
    "Completed",
    "Cancelled"
];

const APPOINTMENT_STATUSES = [
    "Booked",
    "Requested",
    "Confirmed",
    "Completed",
    "Cancelled"
];


// ---------------- API REQUEST ----------------

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(API_BASE + endpoint, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || data.error || "Request failed.");
    }

    return data;
}


// ---------------- HELPER FUNCTIONS ----------------

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getValue(object, ...keys) {
    for (const key of keys) {
        if (object && object[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }
    return "";
}

function showMessage(elementId, message, success = false) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.style.color = success ? "#267347" : "#C13D3D";
}

function getStatusClass(status) {
    return String(status || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function getInitial(name) {
    return String(name || "A").trim().charAt(0).toUpperCase();
}

function getAdminName() {
    return getValue(currentAdmin, "name", "full_name", "username") || "Admin";
}


// ---------------- LOGIN / REGISTER TABS ----------------

function showAdminLoginForm() {
    document.getElementById("adminLoginForm").hidden = false;
    document.getElementById("adminRegisterForm").hidden = true;

    document.getElementById("loginTab").classList.add("active");
    document.getElementById("registerTab").classList.remove("active");
}

function showAdminRegisterForm() {
    document.getElementById("adminLoginForm").hidden = true;
    document.getElementById("adminRegisterForm").hidden = false;

    document.getElementById("loginTab").classList.remove("active");
    document.getElementById("registerTab").classList.add("active");
}


// ---------------- LOGIN ----------------

async function handleAdminLogin(event) {
    event.preventDefault();

    const email = document.getElementById("adminLoginEmail").value.trim();
    const password = document.getElementById("adminLoginPassword").value;

    const button = document.querySelector("#adminLoginForm button[type='submit']");
    button.disabled = true;
    button.textContent = "Logging in...";

    showMessage("adminLoginMessage", "");

    try {
        const data = await apiRequest("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        currentAdmin = data.admin || data.user || {
            name: data.name || "Admin",
            email
        };

        openDashboard();
        await loadDashboard();

    } catch (error) {
        showMessage("adminLoginMessage", error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Login to Dashboard <i data-lucide="arrow-right"></i>';
        refreshIcons();
    }
}


// ---------------- REGISTRATION ----------------

async function handleAdminRegister(event) {
    event.preventDefault();

    const name = document.getElementById("adminRegisterName").value.trim();
    const email = document.getElementById("adminRegisterEmail").value.trim();
    const password = document.getElementById("adminRegisterPassword").value;

    const button = document.querySelector("#adminRegisterForm button[type='submit']");
    button.disabled = true;
    button.textContent = "Creating account...";

    showMessage("adminRegisterMessage", "");

    try {
        const data = await apiRequest("/api/admin/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        showMessage(
            "adminRegisterMessage",
            data.message || "Registration successful. Please log in.",
            true
        );

        document.getElementById("adminRegisterForm").reset();

        showAdminLoginForm();

    } catch (error) {
        showMessage("adminRegisterMessage", error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Create Admin Account <i data-lucide="arrow-right"></i>';
        refreshIcons();
    }
}


// ---------------- OPEN DASHBOARD ----------------

function openDashboard() {
    document.getElementById("adminAuthSection").hidden = true;
    document.getElementById("dashboardSection").hidden = false;

    const name = getAdminName();

    document.getElementById("adminNameDisplay").textContent = name;
    document.getElementById("welcomeAdminName").textContent = name;
    document.getElementById("adminInitial").textContent = getInitial(name);

    showPage("dashboard");
    refreshIcons();
}


// ---------------- DASHBOARD NAVIGATION ----------------

function showPage(pageId) {
    document.querySelectorAll(".admin-page").forEach(page => {
        page.hidden = page.id !== pageId;
    });

    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
        link.classList.remove("active");

        const action = link.getAttribute("onclick") || "";

        if (action.includes("'" + pageId + "'")) {
            link.classList.add("active");
        }
    });

    const titles = {
        dashboard: "Dashboard",
        orders: "Orders",
        trials: "Appointments",
        customers: "Customers",
        designs: "Designs",
        fabrics: "Fabrics",
        measurements: "Measurements",
        tailors: "Tailors",
        payments: "Payments",
        reviews: "Reviews",
        offers: "Offers",
        settings: "Settings"
    };

    document.getElementById("currentPageTitle").textContent =
        titles[pageId] || "Dashboard";

    document.getElementById("adminSidebar").classList.remove("open");
    document.getElementById("mobileOverlay").classList.remove("show");

    refreshIcons();

    if (pageId === "measurements") {
        loadMeasurements();
    }
}



// ---------------- CUSTOMER MEASUREMENTS ----------------

async function loadMeasurements() {
    const table = document.getElementById("measurementsTable");
    if (!table) return;

    table.innerHTML = `
        <tr><td colspan="12" class="empty-state">
            Loading customer measurements...
        </td></tr>
    `;

    try {
        const data = await apiRequest("/api/admin/measurements");

        measurementRecords = data.measurements || [];

        renderMeasurements();

    } catch (error) {
        console.error("Measurements loading error:", error);

        table.innerHTML = `
            <tr><td colspan="12" class="empty-state">
                ${escapeHTML(error.message)}
            </td></tr>
        `;

        setText("measurementCount", "Unable to load records");
    }
}

function renderMeasurements() {
    const table = document.getElementById("measurementsTable");
    const searchInput = document.getElementById("measurementSearch");

    if (!table) return;

    const search = (searchInput?.value || "").trim().toLowerCase();

    const filtered = measurementRecords.filter(record => {
        const searchable = [
            record.customer_id,
            record.customer_name,
            record.email,
            record.phone,
            record.address
        ].join(" ").toLowerCase();

        return searchable.includes(search);
    });

    setText(
        "measurementCount",
        `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`
    );

    if (!filtered.length) {
        table.innerHTML = `
            <tr>
                <td colspan="12" class="empty-state">
                    ${measurementRecords.length
                        ? "No matching customer measurements found."
                        : "No customer measurements have been saved yet."}
                </td>
            </tr>
        `;
        return;
    }

    const fields = [
        "customer_id",
        "customer_name",
        "email",
        "phone",
        "address",
        "height_cm",
        "shoulder_cm",
        "bust_cm",
        "waist_cm",
        "hip_cm",
        "sleeve_cm",
        "dress_length_cm"
    ];

    table.innerHTML = filtered.map(record => `
        <tr>
            ${fields.map(field => {
                const value = getValue(record, field);
                return `<td>${escapeHTML(value === "" ? "—" : value)}</td>`;
            }).join("")}
        </tr>
    `).join("");
}

// ---------------- MOBILE SIDEBAR ----------------

function toggleSidebar() {
    document.getElementById("adminSidebar").classList.toggle("open");
    document.getElementById("mobileOverlay").classList.toggle("show");
}


// ---------------- LOAD DASHBOARD DATA ----------------

async function loadDashboard() {
    try {
        const data = await apiRequest("/api/admin/dashboard");

        const source = data.dashboard || data.data || data;

        dashboardData.orders =
            source.orders || [];

        dashboardData.appointments =
            source.appointments || [];

        dashboardData.customers =
            source.customers || [];

        dashboardData.reviews =
            source.reviews || [];

        updateStatistics(source);
        renderOrders();
        renderAppointments();
        renderCustomers();
        renderPayments();
        renderReviews(source);

    } catch (error) {
        console.error("Dashboard loading error:", error);
    }
}


// ---------------- UPDATE STATISTICS ----------------

function updateStatistics(data = {}) {
    const orders = dashboardData.orders;
    const appointments = dashboardData.appointments;
    const customers = dashboardData.customers;

    const pending = orders.filter(order => {
        const status = String(getValue(order, "status")).toLowerCase();
        return !["completed", "cancelled", "delivered"].includes(status);
    });

    setText("totalCustomers", getValue(data, "total_customers") || customers.length);
    setText("totalAppointments", getValue(data, "total_appointments") || appointments.length);
    setText("totalOrders", getValue(data, "total_orders") || orders.length);
    setText("pendingOrders", getValue(data, "pending_orders") || pending.length);

    setText("receivedCount", countStatus(orders, ["placed", "received"]));
    setText("measuredCount", countStatus(orders, ["measured"]));
    setText("stitchingCount", countStatus(orders, ["in progress", "stitching"]));
    setText("trialCount", countStatus(orders, ["trial"]));
    setText("readyCount", countStatus(orders, ["ready"]));
    setText("deliveredCount", countStatus(orders, ["completed", "delivered"]));
}

function countStatus(orders, statuses) {
    return orders.filter(order =>
        statuses.includes(String(getValue(order, "status")).toLowerCase())
    ).length;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}


// ---------------- RENDER ORDERS ----------------

function renderOrders() {
    const recentTable = document.getElementById("ordersTable");
    const allTable = document.getElementById("allOrdersTable");

    if (!dashboardData.orders.length) {
        recentTable.innerHTML = `
            <tr><td colspan="5" class="empty-state">No orders available yet.</td></tr>
        `;

        allTable.innerHTML = `
            <tr><td colspan="8" class="empty-state">No orders available yet.</td></tr>
        `;
        return;
    }

    const recent = dashboardData.orders.slice(0, 5);

    recentTable.innerHTML = recent.map(order => `
        <tr>
            <td>#${escapeHTML(getValue(order, "id", "order_id"))}</td>
            <td>${escapeHTML(getValue(order, "customer_name", "name"))}</td>
            <td>${escapeHTML(getValue(order, "outfit_type", "outfit"))}</td>
            <td>${escapeHTML(getValue(order, "order_date", "created_at", "date"))}</td>
            <td>
                <span class="status ${getStatusClass(getValue(order, "status"))}">
                    ${escapeHTML(getValue(order, "status") || "Placed")}
                </span>
            </td>
        </tr>
    `).join("");

    allTable.innerHTML = dashboardData.orders.map(order => {
        const id = getValue(order, "id", "order_id");

        return `
            <tr>
                <td>#${escapeHTML(id)}</td>
                <td>${escapeHTML(getValue(order, "customer_name", "name"))}</td>
                <td>${escapeHTML(getValue(order, "outfit_type", "outfit"))}</td>
                <td>${escapeHTML(getValue(order, "color", "colour"))}</td>
                <td>${escapeHTML(getValue(order, "fabric"))}</td>
                <td>${escapeHTML(getValue(order, "occasion"))}</td>
                <td>
                    <span class="status ${getStatusClass(getValue(order, "status"))}">
                        ${escapeHTML(getValue(order, "status") || "Placed")}
                    </span>
                </td>
                <td>
                    <select onchange="updateOrderStatus('${escapeHTML(id)}', this.value)"
                        class="payment-status-select">
                        ${ORDER_STATUSES.map(status => `
                            <option value="${status}"
                                ${String(getValue(order, "status")).toLowerCase() === status.toLowerCase() ? "selected" : ""}>
                                ${status}
                            </option>
                        `).join("")}
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}


// ---------------- UPDATE ORDER STATUS ----------------

async function updateOrderStatus(orderId, status) {
    try {
        await apiRequest(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        alert("Order status updated successfully.");
        await loadDashboard();

    } catch (error) {
        alert(error.message);
    }
}


// ---------------- RENDER APPOINTMENTS ----------------

function renderAppointments() {
    const recentTable = document.getElementById("appointmentsTable");
    const allTable = document.getElementById("allAppointmentsTable");

    if (!dashboardData.appointments.length) {
        recentTable.innerHTML = `
            <tr><td colspan="5" class="empty-state">No appointments available yet.</td></tr>
        `;

        allTable.innerHTML = `
            <tr><td colspan="7" class="empty-state">No appointments available yet.</td></tr>
        `;
        return;
    }

    recentTable.innerHTML = dashboardData.appointments.slice(0, 5).map(item => `
        <tr>
            <td>#${escapeHTML(getValue(item, "id", "appointment_id"))}</td>
            <td>${escapeHTML(getValue(item, "customer_name", "name"))}</td>
            <td>${escapeHTML(getValue(item, "date", "appointment_date"))}</td>
            <td>${escapeHTML(getValue(item, "time", "appointment_time"))}</td>
            <td>
                <span class="status ${getStatusClass(getValue(item, "status"))}">
                    ${escapeHTML(getValue(item, "status") || "Requested")}
                </span>
            </td>
        </tr>
    `).join("");

    allTable.innerHTML = dashboardData.appointments.map(item => {
        const id = getValue(item, "id", "appointment_id");

        return `
            <tr>
                <td>#${escapeHTML(id)}</td>
                <td>${escapeHTML(getValue(item, "customer_name", "name"))}</td>
                <td>${escapeHTML(getValue(item, "date", "appointment_date"))}</td>
                <td>${escapeHTML(getValue(item, "time", "appointment_time"))}</td>
                <td>${escapeHTML(getValue(item, "purpose", "appointment_purpose"))}</td>
                <td>
                    <span class="status ${getStatusClass(getValue(item, "status"))}">
                        ${escapeHTML(getValue(item, "status") || "Requested")}
                    </span>
                </td>
                <td>
                    <select onchange="updateAppointmentStatus('${escapeHTML(id)}', this.value)"
                        style="padding:8px;border:1px solid #DCE3EC;border-radius:7px;">
                        ${APPOINTMENT_STATUSES.map(status => `
                            <option value="${status}"
                                ${String(getValue(item, "status")).toLowerCase() === status.toLowerCase() ? "selected" : ""}>
                                ${status}
                            </option>
                        `).join("")}
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}


// ---------------- UPDATE APPOINTMENT STATUS ----------------

async function updateAppointmentStatus(appointmentId, status) {
    try {
        await apiRequest(`/api/admin/appointments/${encodeURIComponent(appointmentId)}`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        alert("Appointment status updated successfully.");
        await loadDashboard();

    } catch (error) {
        alert(error.message);
    }
}


// ---------------- RENDER CUSTOMERS ----------------

function renderCustomers() {
    const table = document.getElementById("customersTable");

    if (!dashboardData.customers.length) {
        table.innerHTML = `
            <tr><td colspan="4" class="empty-state">No customers available yet.</td></tr>
        `;
        return;
    }

    table.innerHTML = dashboardData.customers.map(customer => `
        <tr>
            <td>#${escapeHTML(getValue(customer, "id", "customer_id"))}</td>
            <td>${escapeHTML(getValue(customer, "name", "full_name"))}</td>
            <td>${escapeHTML(getValue(customer, "email"))}</td>
            <td>${escapeHTML(getValue(customer, "phone", "phone_number") || "â€”")}</td>
        </tr>
    `).join("");
}




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
                <td>${escapeHTML(getValue(order, "payment_reference") || "Not submitted")}</td>
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

// ---------------- LOGOUT ----------------

async function logout() {
    try {
        await apiRequest("/api/logout", {
            method: "POST"
        });
    } catch (error) {
        console.error("Logout request:", error.message);
    }

    currentAdmin = null;

    dashboardData = {
        appointments: [],
        orders: [],
        customers: [],
        reviews: []
    };

    document.getElementById("dashboardSection").hidden = true;
    document.getElementById("adminAuthSection").hidden = false;

    document.getElementById("adminLoginForm").reset();
    document.getElementById("adminRegisterForm").reset();

    showAdminLoginForm();
}


// ---------------- ICONS ----------------

function refreshIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}


// ---------------- INITIALIZE ----------------

document.addEventListener("DOMContentLoaded", function () {

    const measurementSearch = document.getElementById("measurementSearch");

    if (measurementSearch) {
        measurementSearch.addEventListener("input", renderMeasurements);
    }


    document.getElementById("adminLoginForm")
        .addEventListener("submit", handleAdminLogin);

    document.getElementById("adminRegisterForm")
        .addEventListener("submit", handleAdminRegister);

    refreshIcons();
});