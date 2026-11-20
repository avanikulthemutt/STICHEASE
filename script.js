const API_URL = window.location.origin;

const PAGE_IDS = [
    "customerSection",
    "customerDashboard",
    "profileSection",
    "appointmentSection",
    "designsSection",
    "ordersSection",
    "boutiqueLogin"
];

let currentCustomer = null;


// ---------------- BASIC PAGE NAVIGATION ----------------

function showPage(pageId) {
    PAGE_IDS.forEach(id => {
        const page = document.getElementById(id);
        if (page) page.hidden = id !== pageId;
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshIcons();
}

function showLogin() {
    document.getElementById("loginForm").hidden = false;
    document.getElementById("registerForm").hidden = true;
    clearMessage("authMessage");
    showPage("customerSection");
}

function showRegister() {
    document.getElementById("loginForm").hidden = true;
    document.getElementById("registerForm").hidden = false;
    clearMessage("authMessage");
    showPage("customerSection");
}

function showHome() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    updateCustomerGreeting();
    showPage("customerDashboard");
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// ---------------- MESSAGES ----------------

function showMessage(elementId, message, type = "success") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
}

function clearMessage(elementId) {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = "";
    element.className = "message";
}


// ---------------- API REQUEST ----------------

async function apiRequest(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error(
            "Cannot connect to Stitchease. Please make sure app.py is running."
        );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || "Something went wrong. Please try again."
        );
    }

    return data;
}


// ---------------- CUSTOMER REGISTRATION ----------------

async function register() {
    clearMessage("authMessage");

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!name || !email || !password) {
        showMessage("authMessage", "Please fill in all fields.", "error");
        return;
    }

    if (password.length < 8) {
        showMessage(
            "authMessage",
            "Your password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    const button = document.querySelector(
        "#registerForm button[type='submit']"
    );

    if (button) button.disabled = true;

    try {
        const data = await apiRequest("/api/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password })
        });

        showLogin();

        document.getElementById("loginEmail").value = email;
        document.getElementById("loginPassword").value = "";

        showMessage(
            "authMessage",
            data.message || "Registration successful! Please log in."
        );

    } catch (error) {
        document.getElementById("registerForm").hidden = false;
        document.getElementById("loginForm").hidden = true;

        showMessage("authMessage", error.message, "error");

    } finally {
        if (button) button.disabled = false;
    }
}


// ---------------- CUSTOMER LOGIN ----------------

async function login() {
    clearMessage("authMessage");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        showMessage(
            "authMessage",
            "Please enter your email and password.",
            "error"
        );
        return;
    }

    // Corrected button selection and declaration
    const button = document.querySelector(
        "#loginForm form button[type='submit']"
    );

    if (button) button.disabled = true;

    try {
        const data = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (!data.customer || !data.customer.id) {
            throw new Error(
                "Customer details were not returned by the server."
            );
        }

        currentCustomer = {
            id: data.customer.id,
            name: data.customer.name,
            email: data.customer.email
        };

        localStorage.setItem(
            "stitcheaseCustomer",
            JSON.stringify(currentCustomer)
        );

        showHome();

    } catch (error) {
        showMessage("authMessage", error.message, "error");

    } finally {
        if (button) button.disabled = false;
    }
}


// ---------------- CUSTOMER GREETING ----------------

function updateCustomerGreeting() {
    if (!currentCustomer) return;

    const name = currentCustomer.name || "Customer";

    const welcomeMessage = document.getElementById("welcomeMessage");
    const headerCustomerName = document.getElementById("headerCustomerName");
    const userInitial = document.getElementById("userInitial");

    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${name}!`;
    }

    if (headerCustomerName) {
        headerCustomerName.textContent = name;
    }

    if (userInitial) {
        userInitial.textContent =
            name.trim().charAt(0).toUpperCase() || "C";
    }
}


// ---------------- PROFILE AND MEASUREMENTS ----------------

async function openProfile() {
    showPage("profileSection");
    await loadProfile();
}

async function loadProfile() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    clearMessage("profileMessage");

    try {
        const profile = await apiRequest(
            `/api/profile/${currentCustomer.id}`
        );

        document.getElementById("profileName").value =
            profile.name || "";

        document.getElementById("profileEmail").value =
            profile.email || "";

        document.getElementById("profilePhone").value =
            profile.phone || "";

        document.getElementById("profileAddress").value =
            profile.address || "";

        document.getElementById("height").value =
            profile.height_cm ?? "";

        document.getElementById("shoulder").value =
            profile.shoulder_cm ?? "";

        document.getElementById("bust").value =
            profile.bust_cm ?? "";

        document.getElementById("waist").value =
            profile.waist_cm ?? "";

        document.getElementById("hip").value =
            profile.hip_cm ?? "";

        document.getElementById("sleeve").value =
            profile.sleeve_cm ?? "";

        document.getElementById("dressLength").value =
            profile.dress_length_cm ?? "";

    } catch (error) {
        showMessage("profileMessage", error.message, "error");
    }
}

async function saveProfile() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    clearMessage("profileMessage");

    const profile = {
        name: document.getElementById("profileName").value.trim(),
        email: document.getElementById("profileEmail").value.trim(),
        phone: document.getElementById("profilePhone").value.trim(),
        address: document.getElementById("profileAddress").value.trim(),
        height: document.getElementById("height").value,
        shoulder: document.getElementById("shoulder").value,
        bust: document.getElementById("bust").value,
        waist: document.getElementById("waist").value,
        hip: document.getElementById("hip").value,
        sleeve: document.getElementById("sleeve").value,
        dressLength: document.getElementById("dressLength").value
    };

    if (!profile.name || !profile.email) {
        showMessage(
            "profileMessage",
            "Name and email are required.",
            "error"
        );
        return;
    }

    const measurementFields = [
        "height", "shoulder", "bust", "waist",
        "hip", "sleeve", "dressLength"
    ];

    for (const field of measurementFields) {
        const value = profile[field];

        if (
            value !== "" &&
            (!Number.isFinite(Number(value)) || Number(value) <= 0)
        ) {
            showMessage(
                "profileMessage",
                "Measurements must be positive numbers, or left empty.",
                "error"
            );
            return;
        }
    }

    try {
        const data = await apiRequest(
            `/api/profile/${currentCustomer.id}`,
            {
                method: "POST",
                body: JSON.stringify(profile)
            }
        );

        currentCustomer.name = profile.name;
        currentCustomer.email = profile.email;

        localStorage.setItem(
            "stitcheaseCustomer",
            JSON.stringify(currentCustomer)
        );

        updateCustomerGreeting();

        showMessage(
            "profileMessage",
            data.message || "Your profile has been saved successfully."
        );

    } catch (error) {
        showMessage("profileMessage", error.message, "error");
    }
}


// ---------------- APPOINTMENTS ----------------

function openAppointments() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    const dateInput = document.getElementById("appointmentDate");

    if (dateInput) {
        const today = new Date();

        const localToday = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");

        dateInput.min = localToday;
    }

    showPage("appointmentSection");
    renderAppointments();
}

async function bookAppointment() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    clearMessage("appointmentMessage");

    const date = document.getElementById("appointmentDate").value;
    const time = document.getElementById("appointmentTime").value;
    const purpose = document.getElementById("appointmentPurpose").value;
    const notes = document.getElementById("appointmentNotes").value.trim();

    if (!date || !time || !purpose) {
        showMessage(
            "appointmentMessage",
            "Please select a date, time, and purpose.",
            "error"
        );
        return;
    }

    const today = new Date();

    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    if (date < localToday) {
        showMessage(
            "appointmentMessage",
            "Please choose today or a future date.",
            "error"
        );
        return;
    }

    const button = document.querySelector(
        "#appointmentSection button[onclick='bookAppointment()']"
    );

    if (button) button.disabled = true;

    try {
        const data = await apiRequest("/api/appointments", {
            method: "POST",
            body: JSON.stringify({
                customer_id: currentCustomer.id,
                date: date,
                time: time,
                purpose: purpose,
                notes: notes
            })
        });

        document.getElementById("appointmentDate").value = "";
        document.getElementById("appointmentTime").value = "";
        document.getElementById("appointmentPurpose").value = "";
        document.getElementById("appointmentNotes").value = "";

        await renderAppointments();

        showMessage(
            "appointmentMessage",
            data.message ||
            "Your appointment request has been submitted successfully!"
        );

    } catch (error) {
        showMessage("appointmentMessage", error.message, "error");

    } finally {
        if (button) button.disabled = false;
    }
}

async function renderAppointments() {
    const container = document.getElementById("appointmentsList");

    if (!container || !currentCustomer) return;

    container.replaceChildren();

    const loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = "Loading your appointments...";
    container.appendChild(loading);

    try {
        const data = await apiRequest(
            `/api/appointments/${currentCustomer.id}`
        );

        const appointments = Array.isArray(data.appointments)
            ? data.appointments
            : [];

        container.replaceChildren();

        if (appointments.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent = "No appointments booked yet.";
            container.appendChild(empty);
            return;
        }

        appointments.sort((a, b) =>
            `${a.appointment_date} ${a.appointment_time}`.localeCompare(
                `${b.appointment_date} ${b.appointment_time}`
            )
        );

        appointments.forEach(appointment => {
            const card = document.createElement("article");
            card.className = "appointment-item";

            const heading = document.createElement("h3");
            heading.textContent =
                appointment.purpose || "Boutique Appointment";

            const date = document.createElement("p");
            date.textContent = `Date: ${appointment.appointment_date}`;

            const time = document.createElement("p");
            time.textContent =
                `Time: ${String(appointment.appointment_time || "").slice(0, 5)}`;

            const status = document.createElement("span");
            status.className = "appointment-status";
            status.textContent = appointment.status || "Requested";

            card.append(heading, date, time);

            if (appointment.notes) {
                const notes = document.createElement("p");
                notes.textContent = `Notes: ${appointment.notes}`;
                card.appendChild(notes);
            }

            card.appendChild(status);
            container.appendChild(card);
        });

        refreshIcons();

    } catch (error) {
        container.replaceChildren();

        const errorMessage = document.createElement("p");
        errorMessage.className = "empty-state";
        errorMessage.textContent = error.message;

        container.appendChild(errorMessage);
    }
}


// ---------------- FASHION PREFERENCES ----------------

function saveFashionPreferences() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    const outfitType = document.getElementById("outfitType").value;

    if (!outfitType) {
        showMessage(
            "fashionMessage",
            "Please select an outfit type.",
            "error"
        );
        return;
    }

    const preferences = {
        outfitType,
        colour: document.getElementById("outfitColor").value.trim(),
        fabric: document.getElementById("outfitFabric").value.trim(),
        occasion: document.getElementById("outfitOccasion").value,
        style: document.getElementById("outfitStyle").value.trim()
    };

    localStorage.setItem(
        `stitcheaseFashion_${currentCustomer.id}`,
        JSON.stringify(preferences)
    );

    showMessage(
        "fashionMessage",
        "Your fashion preferences have been saved. AI design generation can be connected next."
    );
}


// ---------------- MY ORDERS ----------------

const ORDER_STATUSES = [
    "Placed",
    "Confirmed",
    "In Progress",
    "Ready",
    "Completed"
];

const ORDER_BASE_PRICES = {
    "Kurti": 1000,
    "Saree Blouse": 1200,
    "Lehenga": 3500,
    "Gown": 2800,
    "Dress": 1500,
    "Other": 1500
};

const FABRIC_EXTRA_PRICES = {
    cotton: 0, rayon: 100, linen: 150, crepe: 150,
    georgette: 200, chiffon: 200, net: 150, satin: 250,
    velvet: 400, silk: 500, banarasi: 800
};

const DESIGN_WORK_PRICES = {
    simple: 0,
    moderate: 700,
    heavy: 1500
};

function detectDesignComplexity(description) {
    const value = String(description || "").toLowerCase();
    const heavyWords = [
        "heavy", "bridal", "zari", "embroidery", "embroidered",
        "mirror work", "stone work", "stones", "sequins", "sequence",
        "beads", "handwork", "kundan", "maggam", "cutdana"
    ];
    const moderateWords = [
        "lace", "piping", "pleats", "frill", "ruffle", "border",
        "cutwork", "lining", "gathering", "moderate"
    ];
    if (heavyWords.some(word => value.includes(word))) return "heavy";
    if (moderateWords.some(word => value.includes(word))) return "moderate";
    return "simple";
}

function getFabricExtraPrice(fabric) {
    const value = String(fabric || "").toLowerCase();
    for (const [name, price] of Object.entries(FABRIC_EXTRA_PRICES)) {
        if (value.includes(name)) return price;
    }
    return value ? 100 : 0;
}

function formatOrderDate(dateString) {
    if (!dateString) return "Not available";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function calculateCompletionDate(createdAt, duration) {
    if (!createdAt) return null;

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) return null;

    date.setDate(date.getDate() + Number(duration || 5));

    return date.toISOString();
}

function calculateOrderPrice() {
    const type = document.getElementById("orderOutfitType")?.value || "";
    const fabric = document.getElementById("orderFabric")?.value || "";
    const description = document.getElementById("orderDescription")?.value || "";
    const duration = Number(document.getElementById("orderDuration")?.value || 5);

    const basePrice = ORDER_BASE_PRICES[type] || 1000;
    const fabricExtra = getFabricExtraPrice(fabric);
    const complexity = detectDesignComplexity(description);
    const designExtra = DESIGN_WORK_PRICES[complexity];
    const rushExtra = Math.max(0, 7 - duration) * 50;
    const estimate = Math.round(basePrice + fabricExtra + designExtra + rushExtra);

    const priceElement = document.getElementById("orderPrice");
    if (priceElement) {
        priceElement.textContent = `₹${estimate.toLocaleString("en-IN")}`;
    }
    return estimate;
}

async function openOrders() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    showPage("ordersSection");
    clearMessage("orderMessage");
    calculateOrderPrice();

    await renderOrders();
}

async function placeCustomOrder() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    clearMessage("orderMessage");

    const outfitType =
        document.getElementById("orderOutfitType").value;

    const colour =
        document.getElementById("orderColor").value.trim();

    const fabric =
        document.getElementById("orderFabric").value.trim();

    const occasion =
        document.getElementById("orderOccasion").value;

    const description =
        document.getElementById("orderDescription").value.trim();

    const duration =
        Number(document.getElementById("orderDuration").value);

    const payment =
        document.getElementById("orderPayment").value;

    if (!outfitType || !colour || !fabric || !payment) {
        showMessage(
            "orderMessage",
            "Please complete the required order details.",
            "error"
        );
        return;
    }

    if (![3, 5, 7, 10, 14].includes(duration)) {
        showMessage(
            "orderMessage",
            "Please choose a valid customization duration.",
            "error"
        );
        return;
    }

    const button = document.querySelector(
        "#customOrderForm button[type='submit']"
    );

    if (button) button.disabled = true;

    try {
        const estimatedPrice = calculateOrderPrice();

        const data = await apiRequest("/api/orders", {
            method: "POST",
            body: JSON.stringify({
                customer_id: currentCustomer.id,
                outfit_type: outfitType,
                colour: colour,
                fabric: fabric,
                occasion: occasion,
                description: description,
                duration_days: duration,
                payment_mode: payment,
                estimated_price: estimatedPrice
            })
        });

        document.getElementById("customOrderForm").reset();
        document.getElementById("orderDuration").value = "5";

        calculateOrderPrice();

        await renderOrders();

        showMessage(
            "orderMessage",
            data.message ||
            `Your order #${data.order_id} has been placed successfully!`
        );

    } catch (error) {
        showMessage("orderMessage", error.message, "error");

    } finally {
        if (button) button.disabled = false;
    }
}

async function renderOrders() {
    const container = document.getElementById("ordersList");

    if (!container || !currentCustomer) return;

    container.replaceChildren();

    const loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = "Loading your orders...";
    container.appendChild(loading);

    try {
        const data = await apiRequest(
            `/api/orders/${currentCustomer.id}`
        );

        const orders = Array.isArray(data.orders) ? data.orders : [];

        container.replaceChildren();

        if (orders.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent = "You haven't placed any orders yet.";
            container.appendChild(empty);
            refreshIcons();
            return;
        }

        orders.forEach(order => {
            const card = document.createElement("article");
            card.className = "order-card";

            const header = document.createElement("div");
            header.className = "order-card-header";

            const titleArea = document.createElement("div");

            const title = document.createElement("h3");
            title.textContent = order.outfit_type || "Custom Outfit";

            const number = document.createElement("span");
            number.className = "order-number";
            number.textContent = `Order #${order.id}`;

            titleArea.append(title, number);

            const status = document.createElement("span");
            status.className = "order-status";

            if (order.status === "Completed") {
                status.classList.add("status-completed");
            }

            if (order.status === "Cancelled") {
                status.classList.add("status-cancelled");
            }

            status.textContent = order.status || "Placed";

            header.append(titleArea, status);

            const details = document.createElement("div");
            details.className = "order-details";

            const duration = Number(order.duration_days || 5);

            const completionDate = calculateCompletionDate(
                order.created_at,
                duration
            );

            const estimatedPrice = Number(order.estimated_price || 0);

            const fields = [
                ["Colour", order.colour || "Not specified"],
                ["Fabric", order.fabric || "Not specified"],
                ["Occasion", order.occasion || "Not specified"],
                [
                    "Customization",
                    order.description || "No additional details"
                ],
                ["Payment", order.payment_mode || "Not specified"],
                [
                    "Estimated price",
                    `₹${estimatedPrice.toLocaleString("en-IN")}`
                ],
                ["Placed on", formatOrderDate(order.created_at)],
                ["Duration", `${duration} days`],
                [
                    "Expected completion",
                    formatOrderDate(completionDate)
                ]
            ];

            fields.forEach(([label, value]) => {
                const line = document.createElement("p");

                const strong = document.createElement("strong");
                strong.textContent = `${label}: `;

                line.append(
                    strong,
                    document.createTextNode(String(value))
                );

                details.appendChild(line);
            });

            card.append(header, details);

            // ORDER TRACKING TIMELINE

            if (order.status !== "Cancelled") {
                const tracking = document.createElement("div");
                tracking.className = "order-tracking";

                const trackingTitle = document.createElement("h4");
                trackingTitle.textContent = "Order Tracking";

                const steps = document.createElement("div");
                steps.className = "order-steps";

                const statusIndex = ORDER_STATUSES.indexOf(order.status);

                ORDER_STATUSES.forEach((step, index) => {
                    const item = document.createElement("div");
                    item.className = "order-step";

                    const stepName = document.createElement("span");
                    stepName.textContent = step;

                    item.appendChild(stepName);

                    if (statusIndex >= 0 && index < statusIndex) {
                        item.classList.add("done");
                    } else if (index === statusIndex) {
                        item.classList.add("current");
                    }

                    steps.appendChild(item);
                });

                tracking.append(trackingTitle, steps);
                card.appendChild(tracking);

            } else {
                const cancelledMessage = document.createElement("p");
                cancelledMessage.className = "order-material-note";
                cancelledMessage.textContent =
                    "This order has been cancelled.";

                card.appendChild(cancelledMessage);
            }

            container.appendChild(card);
        });

        refreshIcons();

    } catch (error) {
        container.replaceChildren();

        const errorMessage = document.createElement("p");
        errorMessage.className = "empty-state";
        errorMessage.textContent = error.message;

        container.appendChild(errorMessage);
    }
}


// ---------------- LOGOUT AND SESSION RESTORE ----------------

function logout() {
    currentCustomer = null;

    localStorage.removeItem("stitcheaseCustomer");

    document.getElementById("loginPassword").value = "";

    showLogin();
}

function restoreSession() {
    try {
        const saved = localStorage.getItem("stitcheaseCustomer");

        if (!saved) return;

        const customer = JSON.parse(saved);

        if (
            customer &&
            customer.id &&
            customer.name &&
            customer.email
        ) {
            currentCustomer = customer;
            showHome();
        }

    } catch (error) {
        localStorage.removeItem("stitcheaseCustomer");
    }
}


// ---------------- BOUTIQUE ADMIN ----------------

function showAdminLogin() {
    showPage("boutiqueLogin");
}


// ---------------- INITIALIZE ----------------

document.addEventListener("DOMContentLoaded", () => {
    showLogin();
    restoreSession();

    const outfitSelect =
        document.getElementById("orderOutfitType");

    const durationSelect =
        document.getElementById("orderDuration");

    if (outfitSelect) {
        outfitSelect.addEventListener(
            "change",
            calculateOrderPrice
        );
    }

    if (durationSelect) {
        durationSelect.addEventListener("change", calculateOrderPrice);
    }

    const fabricSelect = document.getElementById("orderFabric");
    const designDescription = document.getElementById("orderDescription");

    if (fabricSelect) {
        fabricSelect.addEventListener("change", calculateOrderPrice);
        fabricSelect.addEventListener("input", calculateOrderPrice);
    }

    if (designDescription) {
        designDescription.addEventListener("input", calculateOrderPrice);
    }

    calculateOrderPrice();
    refreshIcons();
});