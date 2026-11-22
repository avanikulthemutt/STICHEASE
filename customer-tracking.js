
/* =========================================
   STITCHEASE - CUSTOMER DASHBOARD
   Order Tracking + Share Feedback
========================================= */

(() => {
    const STATUSES = [
        "Placed",
        "Confirmed",
        "Measured",
        "In Progress",
        "Trial",
        "Ready",
        "Completed"
    ];

    const form = document.getElementById("trackForm");
    const input = document.getElementById("orderId");
    const button = document.getElementById("trackButton");
    const message = document.getElementById("trackMessage");
    const result = document.getElementById("orderResult");

    const reviewForm = document.getElementById("customerReviewForm");
    const reviewRating = document.getElementById("customerReviewRating");
    const reviewText = document.getElementById("customerReviewText");
    const reviewButton = document.getElementById("submitReviewButton");
    const reviewMessage = document.getElementById("customerReviewMessage");

    // CUSTOMER SESSION
    function readCustomer() {
        try {
            const value = JSON.parse(
                localStorage.getItem("stitcheaseCustomer") || "null"
            );

            return value && Number.isInteger(Number(value.id))
                ? value
                : null;
        } catch (error) {
            return null;
        }
    }

    const customer = readCustomer();

    // MESSAGE HELPER
    function showMessage(element, text, isError = true) {
        element.textContent = text;
        element.style.color = isError ? "#a13f35" : "#477b62";
    }

    // DATE FORMAT
    function formatDate(value) {
        if (!value) return "Date/time not available";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    // ORDER DETAILS
    function addDetail(container, label, value) {
        const item = document.createElement("div");
        item.className = "detail-item";

        const name = document.createElement("span");
        name.textContent = label;

        const content = document.createElement("strong");

        content.textContent =
            value === null || value === undefined || value === ""
                ? "Not specified"
                : String(value);

        item.append(name, content);
        container.appendChild(item);
    }

    // RENDER ORDER
    function renderOrder(order) {
        document.getElementById("outfitName").textContent =
            order.outfit_type || "Custom Outfit";

        document.getElementById("orderNumber").textContent =
            `Order #${order.id} · Placed ${formatDate(order.created_at)}`;

        document.getElementById("currentStatus").textContent =
            order.status || "Placed";

        const details = document.getElementById("orderDetails");
        details.replaceChildren();

        addDetail(details, "Fabric", order.fabric);
        addDetail(details, "Colour", order.colour);
        addDetail(details, "Occasion", order.occasion);

        addDetail(
            details,
            "Estimated Price",
            order.estimated_price == null
                ? "Not specified"
                : `₹${Number(order.estimated_price).toLocaleString("en-IN")}`
        );

        addDetail(
            details,
            "Expected Duration",
            order.duration_days
                ? `${order.duration_days} days`
                : "Not specified"
        );

        addDetail(details, "Payment Mode", order.payment_mode);

        // ORDER TIMELINE
        const timeline = document.getElementById("statusTimeline");
        timeline.replaceChildren();

        const history = Array.isArray(order.status_history)
            ? order.status_history
            : [];

        const latestByStatus = new Map();

        history.forEach(entry => {
            latestByStatus.set(entry.status, entry);
        });

        const currentIndex = STATUSES.indexOf(order.status);

        if (order.status === "Cancelled") {
            const cancelled = document.createElement("div");
            cancelled.className = "timeline-item current";

            const marker = document.createElement("div");
            marker.className = "timeline-marker";

            const copy = document.createElement("div");
            copy.className = "timeline-copy";

            const title = document.createElement("strong");
            title.textContent = "Cancelled";

            const date = document.createElement("small");
            const entry = latestByStatus.get("Cancelled");

            date.textContent = entry
                ? formatDate(entry.changed_at)
                : "Cancellation date not available";

            copy.append(title, date);
            cancelled.append(marker, copy);
            timeline.appendChild(cancelled);

        } else {
            STATUSES.forEach((status, index) => {
                const row = document.createElement("div");
                row.className = "timeline-item";

                if (currentIndex >= 0 && index < currentIndex) {
                    row.classList.add("done");
                }

                if (status === order.status) {
                    row.classList.add("current");
                }

                const marker = document.createElement("div");
                marker.className = "timeline-marker";

                const copy = document.createElement("div");
                copy.className = "timeline-copy";

                const title = document.createElement("strong");
                title.textContent = status;

                const date = document.createElement("small");
                const entry = latestByStatus.get(status);

                if (entry) {
                    date.textContent = formatDate(entry.changed_at);
                } else if (currentIndex >= 0 && index > currentIndex) {
                    date.textContent = "Not started yet";
                    date.className = "pending";
                } else {
                    date.textContent = "Date/time not available";
                }

                copy.append(title, date);

                if (entry && entry.note) {
                    const note = document.createElement("small");
                    note.textContent = entry.note;
                    copy.appendChild(note);
                }

                row.append(marker, copy);
                timeline.appendChild(row);
            });
        }

        result.hidden = false;
    }

    // TRACK ORDER
    form.addEventListener("submit", async event => {
        event.preventDefault();

        result.hidden = true;

        const orderId = Number(input.value);

        if (!customer) {
            showMessage(
                message,
                "Please sign in to Stitchease first, then open Track My Order again."
            );
            return;
        }

        if (!Number.isInteger(orderId) || orderId < 1) {
            showMessage(message, "Please enter a valid order ID.");
            return;
        }

        button.disabled = true;
        button.textContent = "Checking...";

        showMessage(message, "", false);

        try {
            const response = await fetch(
                `/api/order-tracking/${encodeURIComponent(customer.id)}/${encodeURIComponent(orderId)}`,
                {
                    credentials: "same-origin"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not find this order.");
            }

            renderOrder(data.order);

            showMessage(
                message,
                "Order details loaded successfully.",
                false
            );

        } catch (error) {
            showMessage(
                message,
                error.message || "Something went wrong. Please try again."
            );

        } finally {
            button.disabled = false;
            button.textContent = "Track Order";
        }
    });

    // SHARE FEEDBACK
    reviewForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!customer) {
            showMessage(
                reviewMessage,
                "Please sign in to your Stitchease account before submitting feedback."
            );
            return;
        }

        const rating = Number(reviewRating.value);
        const review = reviewText.value.trim();

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            showMessage(reviewMessage, "Please select a valid rating.");
            return;
        }

        if (!review) {
            showMessage(reviewMessage, "Please write your feedback.");
            return;
        }

        reviewButton.disabled = true;
        reviewButton.textContent = "Submitting...";

        showMessage(reviewMessage, "", false);

        try {
            const response = await fetch("/api/reviews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    customer_id: customer.id,
                    rating: rating,
                    review_text: review
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not submit your feedback."
                );
            }

            showMessage(
                reviewMessage,
                data.message || "Thank you! Your feedback has been submitted successfully.",
                false
            );

            reviewForm.reset();

        } catch (error) {
            showMessage(
                reviewMessage,
                error.message || "Something went wrong. Please try again."
            );

        } finally {
            reviewButton.disabled = false;
            reviewButton.textContent = "Submit Feedback";
        }
    });

    // AUTOMATIC ORDER LOOKUP FROM URL
    const params = new URLSearchParams(window.location.search);

    if (params.has("orderId")) {
        input.value = params.get("orderId");
        form.requestSubmit();
    }

})();
