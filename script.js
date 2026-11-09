
const API_URL = "http://127.0.0.1:5000";

// Boutique WhatsApp number
const BOUTIQUE_WHATSAPP_NUMBER = "919738335371";

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
            data.error || data.message || "Something went wrong. Please try again."
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

    const button = document.querySelector(
        "#loginForm button[type='submit']"
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
            email: data.customer.email,
            phone: data.customer.phone || ""
        };

        localStorage.setItem(
            "stitcheaseCustomer",
            JSON.stringify(currentCustomer)
        );

        updateCustomerGreeting();
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

    document.getElementById("welcomeMessage").textContent =
        `Welcome, ${name}!`;

    document.getElementById("headerCustomerName").textContent = name;

    document.getElementById("userInitial").textContent =
        name.trim().charAt(0).toUpperCase() || "C";
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

        currentCustomer.phone =
            profile.phone || currentCustomer.phone || "";

        localStorage.setItem(
            "stitcheaseCustomer",
            JSON.stringify(currentCustomer)
        );

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
        currentCustomer.phone = profile.phone;

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

function appointmentStorageKey() {
    return `stitcheaseAppointments_${currentCustomer.id}`;
}

function getAppointments() {
    if (!currentCustomer) return [];

    try {
        return JSON.parse(
            localStorage.getItem(appointmentStorageKey()) || "[]"
        );
    } catch {
        return [];
    }
}

function openAppointments() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    const dateInput = document.getElementById("appointmentDate");

    const today = new Date();

    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    dateInput.min = localToday;

    showPage("appointmentSection");
    renderAppointments();
}

function bookAppointment() {
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

    const appointments = getAppointments();

    appointments.push({
        id: Date.now(),
        date,
        time,
        purpose,
        notes,
        status: "Requested"
    });

    localStorage.setItem(
        appointmentStorageKey(),
        JSON.stringify(appointments)
    );

    document.getElementById("appointmentDate").value = "";
    document.getElementById("appointmentTime").value = "";
    document.getElementById("appointmentPurpose").value = "";
    document.getElementById("appointmentNotes").value = "";

    renderAppointments();

    showMessage(
        "appointmentMessage",
        "Your appointment request has been saved in this browser."
    );
}

function renderAppointments() {
    const container = document.getElementById("appointmentsList");

    if (!container || !currentCustomer) return;

    const appointments = getAppointments();

    container.replaceChildren();

    if (appointments.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No appointments booked yet.";
        container.appendChild(empty);
        return;
    }

    appointments.sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );

    appointments.forEach(appointment => {
        const card = document.createElement("article");
        card.className = "appointment-item";

        const heading = document.createElement("h3");
        heading.textContent = appointment.purpose;

        const date = document.createElement("p");
        date.textContent = `Date: ${appointment.date}`;

        const time = document.createElement("p");
        time.textContent = `Time: ${appointment.time}`;

        const status = document.createElement("span");
        status.className = "appointment-status";
        status.textContent = appointment.status;

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

const ORDER_PRICES = {
    "Kurti": 1000,
    "Saree Blouse": 1200,
    "Lehenga": 3500,
    "Gown": 2800,
    "Dress": 1500,
    "Other": 1500
};

function orderStorageKey() {
    return `stitcheaseOrders_${currentCustomer.id}`;
}

function getOrders() {
    if (!currentCustomer) return [];

    try {
        const orders = JSON.parse(
            localStorage.getItem(orderStorageKey()) || "[]"
        );

        return Array.isArray(orders) ? orders : [];

    } catch {
        return [];
    }
}

function saveOrders(orders) {
    localStorage.setItem(
        orderStorageKey(),
        JSON.stringify(orders)
    );
}

function formatOrderDate(dateString) {
    if (!dateString) return "Not available";

    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


// ---------------- ORDER PRICE CALCULATION ----------------

function calculateOrderPrice() {
    const type =
        document.getElementById("orderOutfitType")?.value || "";

    const duration = Number(
        document.getElementById("orderDuration")?.value || 5
    );

    const basePrice = ORDER_PRICES[type] || 1000;

    const estimate = Math.round(
        basePrice + Math.max(0, 7 - duration) * 50
    );

    const priceElement = document.getElementById("orderPrice");

    if (priceElement) {
        priceElement.textContent =
            `₹${estimate.toLocaleString("en-IN")}`;
    }

    return estimate;
}


// ---------------- OPEN MY ORDERS ----------------

function openOrders() {
    if (!currentCustomer) {
        showLogin();
        return;
    }

    showPage("ordersSection");

    clearMessage("orderMessage");

    calculateOrderPrice();
    renderOrders();
}


// ---------------- WHATSAPP ORDER NOTIFICATION ----------------

async function sendOrderWhatsAppNotification(order) {
    try {
        const response = await fetch(`${API_URL}/api/send-whatsapp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                phone: BOUTIQUE_WHATSAPP_NUMBER,
                name: currentCustomer?.name || "Customer",
                order_id: order.id,
                outfit: [
                    order.outfitType,
                    `Colour: ${order.colour}`,
                    `Fabric: ${order.fabric}`,
                    `Occasion: ${order.occasion || "Not specified"}`,
                    `Customization: ${order.description || "Not specified"}`,
                    `Estimated price: Rs. ${Number(order.estimatedPrice).toLocaleString("en-IN")}`,
                    `Expected completion: ${formatOrderDate(order.completionDate)}`
                ].join(" | "),
                status: order.status
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || data.error || "WhatsApp notification could not be sent."
            );
        }

        showMessage(
            "orderMessage",
            `Order ${order.id} placed successfully! WhatsApp notification sent to the boutique.`,
            "success"
        );

        return true;

    } catch (error) {
        console.error("WhatsApp notification error:", error);

        showMessage(
            "orderMessage",
            `Order ${order.id} was saved in this browser, but the WhatsApp notification failed: ${error.message}`,
            "error"
        );

        return false;
    }
}


// ---------------- PLACE CUSTOM ORDER ----------------

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


    const today = new Date();

    today.setHours(12, 0, 0, 0);

    const completion = new Date(today);

    completion.setDate(
        completion.getDate() + duration
    );


    const dateToString = date => [

        date.getFullYear(),

        String(date.getMonth() + 1).padStart(2, "0"),

        String(date.getDate()).padStart(2, "0")

    ].join("-");


    const order = {

        id: `ST${Date.now().toString().slice(-8)}`,

        outfitType,

        colour,

        fabric,

        occasion,

        description,

        duration,

        payment,

        estimatedPrice: calculateOrderPrice(),

        placedDate: dateToString(today),

        completionDate: dateToString(completion),

        status: "Placed",

        materialIssue: "",

        alternativeMaterial: ""

    };


    // Save the order in the browser.

    const orders = getOrders();

    orders.unshift(order);

    saveOrders(orders);


    // Reset the order form.

    document.getElementById("customOrderForm").reset();

    document.getElementById("orderDuration").value = "5";


    calculateOrderPrice();

    renderOrders();


    // Send the order notification through the Flask/Twilio backend.
    showMessage(
        "orderMessage",
        `Order ${order.id} saved. Sending WhatsApp notification to the boutique...`
    );

    await sendOrderWhatsAppNotification(order);
}


// ---------------- CANCEL CUSTOM ORDER ----------------

function cancelCustomOrder(orderId) {

    const orders = getOrders();

    const order = orders.find(
        item => item.id === orderId
    );

    if (
        !order ||
        ["Completed", "Cancelled"].includes(order.status)
    ) {
        return;
    }

    if (!window.confirm(`Cancel order ${order.id}?`)) {
        return;
    }

    order.status = "Cancelled";

    saveOrders(orders);

    renderOrders();
}


// ---------------- RENDER MY ORDERS ----------------

function renderOrders() {

    const container = document.getElementById("ordersList");

    if (!container || !currentCustomer) return;

    const orders = getOrders();

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

        title.textContent = order.outfitType;


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

        if (order.status === "On Hold - Material Unavailable") {
            status.classList.add("status-hold");
        }


        status.textContent = order.status;

        header.append(titleArea, status);


        const details = document.createElement("div");

        details.className = "order-details";


        const fields = [

            ["Colour", order.colour],

            ["Fabric", order.fabric],

            ["Occasion", order.occasion || "Not specified"],

            ["Customization", order.description || "No additional details"],

            ["Payment", order.payment],

            [
                "Estimated price",
                `₹${Number(order.estimatedPrice).toLocaleString("en-IN")}`
            ],

            ["Placed on", formatOrderDate(order.placedDate)],

            ["Duration", `${order.duration} days`],

            [
                "Expected completion",
                formatOrderDate(order.completionDate)
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


        // Material unavailable notification

        if (order.status === "On Hold - Material Unavailable") {

            const note = document.createElement("div");

            note.className = "order-material-note";

            note.textContent =
                `Material unavailable: ${order.materialIssue || "Please contact the boutique."}` +
                (order.alternativeMaterial
                    ? ` Alternative: ${order.alternativeMaterial}`
                    : "");

            card.appendChild(note);
        }


        // Order tracking progress

        if (order.status !== "Cancelled") {

            const tracking = document.createElement("div");

            tracking.className = "order-tracking";


            const trackingTitle = document.createElement("h4");

            trackingTitle.textContent = "Order progress";


            const steps = document.createElement("div");

            steps.className = "order-steps";


            const statusIndex = ORDER_STATUSES.indexOf(order.status);


            ORDER_STATUSES.forEach((step, index) => {

                const item = document.createElement("div");

                item.className = "order-step";

                item.textContent = step;


                if (statusIndex >= 0 && index < statusIndex) {

                    item.classList.add("done");

                } else if (index === statusIndex) {

                    item.classList.add("current");

                }

                steps.appendChild(item);

            });


            tracking.append(trackingTitle, steps);

            card.appendChild(tracking);

        }


        // Cancel order button

        if (!["Completed", "Cancelled"].includes(order.status)) {

            const cancelButton = document.createElement("button");

            cancelButton.type = "button";

            cancelButton.className =
                "btn btn-outline btn-small order-cancel-button";

            cancelButton.textContent = "Cancel Order";


            cancelButton.addEventListener("click", () => {

                cancelCustomOrder(order.id);

            });


            card.appendChild(cancelButton);

        }


        container.appendChild(card);

    });


    refreshIcons();

}


// ---------------- LOGOUT ----------------

function logout() {

    currentCustomer = null;

    localStorage.removeItem("stitcheaseCustomer");

    document.getElementById("loginPassword").value = "";

    showLogin();
}


// ---------------- RESTORE SESSION ----------------

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

            currentCustomer.phone =
                currentCustomer.phone || "";

            updateCustomerGreeting();

            showHome();

        }

    } catch {

        localStorage.removeItem("stitcheaseCustomer");

    }

}


// ---------------- BOUTIQUE ADMIN PLACEHOLDER ----------------

function showAdminLogin() {

    showPage("boutiqueLogin");

}


// ---------------- INITIALIZE WEBSITE ----------------

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

        durationSelect.addEventListener(
            "change",
            calculateOrderPrice
        );

    }


    calculateOrderPrice();

    refreshIcons();

});


// ================= STITCHEASE CHATBOT =================

document.addEventListener("DOMContentLoaded", () => {

    const chatbotToggle =
        document.getElementById("chatbotToggle");

    const chatbotWindow =
        document.getElementById("chatbotWindow");

    const chatbotClose =
        document.getElementById("chatbotClose");

    const chatbotForm =
        document.getElementById("chatbotForm");

    const chatbotText =
        document.getElementById("chatbotText");

    const chatbotMessages =
        document.getElementById("chatbotMessages");


    if (
        !chatbotToggle ||
        !chatbotWindow ||
        !chatbotClose ||
        !chatbotForm ||
        !chatbotText ||
        !chatbotMessages
    ) {
        return;
    }


    chatbotToggle.addEventListener("click", () => {

        chatbotWindow.hidden = false;

        chatbotToggle.hidden = true;

        chatbotText.focus();

    });


    function closeChatbot() {

        chatbotWindow.hidden = true;

        chatbotToggle.hidden = false;

        chatbotToggle.focus();

    }


    chatbotClose.addEventListener(
        "click",
        closeChatbot
    );


    function addChatMessage(message, className) {

        const messageElement =
            document.createElement("div");

        messageElement.className = className;

        messageElement.textContent = message;

        chatbotMessages.appendChild(messageElement);

        chatbotMessages.scrollTop =
            chatbotMessages.scrollHeight;

    }


    function getChatbotReply(message) {

        const text = message.toLowerCase().trim();


        if (
            /^(hi|hello|hey|hii|good morning|good afternoon|good evening)\b/.test(text)
        ) {

            return "Hello! 😊 Welcome to Stitchease. How can I help you today?";

        }


        if (
            text.includes("appointment") ||
            text.includes("book")
        ) {

            return "You can book an appointment by logging in and opening the Appointment Booking section.";

        }


        if (
            text.includes("order") ||
            text.includes("track")
        ) {

            return "You can place a custom order and check its status in the My Orders section after logging in.";

        }


        if (
            text.includes("measurement") ||
            text.includes("size")
        ) {

            return "You can save your measurements in your Profile section after logging in.";

        }


        if (
            text.includes("profile") ||
            text.includes("account")
        ) {

            return "Log in to Stitchease and open the Profile section to view or update your details.";

        }


        if (
            text.includes("contact") ||
            text.includes("address") ||
            text.includes("location")
        ) {

            return "Please contact the Stitchease boutique team for contact and location details.";

        }


        if (text.includes("thank")) {

            return "You're most welcome! 😊 Happy to help.";

        }


        if (/\b(bye|goodbye)\b/.test(text)) {

            return "Goodbye! Thank you for visiting Stitchease. Have a lovely day! 💗";

        }


        return "Thanks for your message! 😊 You can ask me about appointments, custom orders, measurements, or your profile.";

    }


    chatbotForm.addEventListener("submit", (event) => {

        event.preventDefault();

        const message = chatbotText.value.trim();

        if (!message) return;


        addChatMessage(message, "user-message");

        chatbotText.value = "";


        const reply = getChatbotReply(message);


        window.setTimeout(() => {

            addChatMessage(reply, "bot-message");

            chatbotText.focus();

        }, 350);

    });

});
