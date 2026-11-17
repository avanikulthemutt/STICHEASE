
/* =========================================
   STITCHEASE - EXPLORE FASHION
========================================= */

/* PRODUCT COLLECTION */

const products = [
    {
        id: 1,
        name: "Banarasi Silk Saree",
        category: "Sarees",
        price: 8999,
        rating: "4.9",
        occasion: "Wedding",
        colour: "Gold",
        tag: "Bestseller",
        trending: true,
        sizes: ["S", "M", "L", "XL"],
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=85"
    },
    {
        id: 2,
        name: "Kanjeevaram Silk Saree",
        category: "Sarees",
        price: 10999,
        rating: "4.9",
        occasion: "Wedding",
        colour: "Maroon",
        tag: "Trending",
        trending: true,
        sizes: ["S", "M", "L", "XL"],
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=85"
    },
    {
        id: 3,
        name: "Organza Floral Saree",
        category: "Sarees",
        price: 6499,
        rating: "4.7",
        occasion: "Party",
        colour: "Rose",
        tag: "New Arrival",
        trending: false,
        sizes: ["S", "M", "L", "XL"],
        image: "https://images.unsplash.com/photo-1583391733956-6c78276477e3?auto=format&fit=crop&w=700&q=85"
    },
    {
        id: 4,
        name: "Mirror Work Blouse",
        category: "Blouses",
        price: 1799,
        rating: "4.6",
        occasion: "Party",
        colour: "Emerald",
        tag: "Trending",
        trending: true,
        sizes: ["S", "M", "L", "XL"],
        image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=85"
    },
    {
        id: 5,
        name: "Zari Silk Blouse",
        category: "Blouses",
        price: 2299,
        rating: "4.8",
        occasion: "Festive",
        colour: "Gold",
        tag: "New Arrival",
        trending: false,
        sizes: ["S", "M", "L", "XL"],
        image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=85"
    },
    {
        id: 6,
        name: "Antique Gold Jhumkas",
        category: "Jhumkas",
        price: 899,
        rating: "4.8",
        occasion: "Festive",
        colour: "Gold",
        tag: "Trending",
        trending: true,
        sizes: ["One Size"],
        image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=700&q=85"
    },
    {
        id: 7,
        name: "Pearl Chandbali Jhumkas",
        category: "Jhumkas",
        price: 1299,
        rating: "4.7",
        occasion: "Wedding",
        colour: "Ivory",
        tag: "Bestseller",
        trending: false,
        sizes: ["One Size"],
        image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=700&q=85"
    },
    {
        id: 8,
        name: "Temple Design Jhumkas",
        category: "Jhumkas",
        price: 699,
        rating: "4.6",
        occasion: "Festive",
        colour: "Gold",
        tag: "Traditional Pick",
        trending: false,
        sizes: ["One Size"],
        image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=700&q=85"
    }
];

/* STORAGE */

function readStorage(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}

let cart = readStorage("stitcheaseFashionCart");
let savedDesigns = readStorage("stitcheaseSavedDesigns");

const money = amount =>
    "₹" + Number(amount).toLocaleString("en-IN");

function element(id) {
    return document.getElementById(id);
}

/* =========================================
   PRODUCT DISPLAY AND FILTERS
========================================= */

function displayProducts() {
    const category = element("filterCategory").value;
    const size = element("filterSize").value;
    const colour = element("filterColour").value;
    const occasion = element("filterOccasion").value;
    const maxPrice = Number(element("maxPrice").value);
    const sort = element("sortProducts").value;

    let filtered = products.filter(product => {
        return (
            (category === "All" ||
                (category === "Trending"
                    ? product.trending
                    : product.category === category)) &&

            (size === "All" ||
                product.sizes.includes(size)) &&

            (colour === "All" || product.colour === colour) &&
            (occasion === "All" || product.occasion === occasion) &&
            product.price <= maxPrice
        );
    });

    if (sort === "low") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sort === "high") {
        filtered.sort((a, b) => b.price - a.price);
    }

    element("resultCount").textContent =
        filtered.length +
        (filtered.length === 1
            ? " piece to explore"
            : " pieces to explore");

    const grid = element("productGrid");

    if (!filtered.length) {
        grid.innerHTML = `
            <div class="no-products">
                <h3>No matching products found</h3>
                <p>Try changing your filters to explore more styles.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(product => `
        <article class="product-card">

            <div class="product-photo">
                <img
                    src="${product.image}"
                    alt="${product.name}"
                    loading="lazy"
                >
                <span class="product-tag">${product.tag}</span>
            </div>

            <div class="product-details">
                <span class="product-category">
                    ${product.category}
                </span>

                <h3>${product.name}</h3>

                <div class="product-price">
                    ${money(product.price)}
                </div>

                <div class="product-meta">
                    ★ ${product.rating} · ${product.occasion}
                </div>

                <div class="product-sizes">
                    ${product.category === "Jhumkas"
                        ? "One Size"
                        : "Sizes: " + product.sizes.join(", ")}
                </div>

                <div class="product-actions">
                    <button onclick="viewProduct(${product.id})">
                        View Details
                    </button>

                    ${product.category !== "Jhumkas" ? `
                        <button class="customise-product"
                            onclick="customiseProduct(${product.id})">
                            Customise
                        </button>
                    ` : ""}

                    <button onclick="addToCart(${product.id})">
                        + Add to Bag
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}

/* PRODUCT DETAILS */

function viewProduct(id) {
    const product = products.find(item => item.id === id);

    if (!product) return;

    alert(
        product.name + "\n\n" +
        "Category: " + product.category + "\n" +
        "Price: " + money(product.price) + "\n" +
        "Rating: " + product.rating + "\n" +
        "Occasion: " + product.occasion + "\n" +
        "Colour: " + product.colour
    );
}

/* CUSTOMISE A PRODUCT */

function customiseProduct(id) {
    const product = products.find(item => item.id === id);

    if (!product) return;

    element("designOutfit").value =
        product.category === "Sarees"
            ? "Saree"
            : "Blouse";

    const colourSelect = element("designColour");

    if ([...colourSelect.options].some(option =>
        option.value === product.colour
    )) {
        colourSelect.value = product.colour;
    }

    updateDesignSummary();

    element("studio").scrollIntoView({
        behavior: "smooth"
    });
}

/* FILTER EVENTS */

[
    "filterCategory",
    "filterSize",
    "filterColour",
    "filterOccasion",
    "maxPrice",
    "sortProducts"
].forEach(id => {
    element(id).addEventListener("input", () => {
        element("priceValue").textContent =
            money(element("maxPrice").value);

        displayProducts();
    });

    element(id).addEventListener("change", displayProducts);
});

/* CLEAR FILTERS */

element("clearFilters").addEventListener("click", () => {
    element("filterCategory").value = "All";
    element("filterSize").value = "All";
    element("filterColour").value = "All";
    element("filterOccasion").value = "All";
    element("maxPrice").value = 15000;
    element("sortProducts").value = "featured";

    element("priceValue").textContent = "₹15,000";

    displayProducts();
});

/* CATEGORY CARD CLICK */

document.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => {
        const category = card.dataset.category;

        if (category === "Custom Outfits") {
            element("studio").scrollIntoView({
                behavior: "smooth"
            });
            return;
        }

        element("filterCategory").value = category;
        displayProducts();

        element("shop").scrollIntoView({
            behavior: "smooth"
        });
    });
});

/* TRENDING BUTTON */

element("trendingButton").addEventListener("click", event => {
    event.preventDefault();

    element("filterCategory").value = "Trending";
    displayProducts();

    element("shop").scrollIntoView({
        behavior: "smooth"
    });
});

/* =========================================
   SHOPPING CART
========================================= */

function saveCart() {
    localStorage.setItem(
        "stitcheaseFashionCart",
        JSON.stringify(cart)
    );

    updateCart();
}

function addToCart(id) {
    const product = products.find(item => item.id === id);

    if (!product) return;

    cart.push({
        id: Date.now(),
        name: product.name,
        price: product.price,
        type: "Ready-made"
    });

    saveCart();
    toggleCart(true);
}

function addCustomDesignToCart() {
    const design = getDesign();

    cart.push({
        id: Date.now(),
        name: design.Outfit + " - Custom design",
        price: estimatePrice(),
        type: "Custom design"
    });

    saveCart();
    toggleCart(true);
}

function removeCartItem(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

function updateCart() {
    element("cartCount").textContent = cart.length;

    const container = element("cartItems");

    if (!cart.length) {
        container.innerHTML = `
            <div class="cart-empty">
                <span>♡</span>
                <p>Your bag is empty.</p>
                <small>Add a ready-made piece or custom design.</small>
            </div>
        `;
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong>
                    <small>${item.type}</small>
                    <small>${money(item.price)}</small>
                </div>

                <button class="remove-item"
                    onclick="removeCartItem(${item.id})">
                    Remove
                </button>
            </div>
        `).join("");
    }

    const total = cart.reduce(
        (sum, item) => sum + Number(item.price || 0),
        0
    );

    element("cartTotal").textContent = money(total);
}

function toggleCart(open) {
    element("cartDrawer").classList.toggle("open", open);
    element("cartBackdrop").classList.toggle("show", open);

    document.body.style.overflow = open ? "hidden" : "";
}

element("openCart").addEventListener("click", () => {
    toggleCart(true);
});

element("closeCart").addEventListener("click", () => {
    toggleCart(false);
});

element("cartBackdrop").addEventListener("click", () => {
    toggleCart(false);
});

/* CLOSE CART WITH ESCAPE KEY */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        toggleCart(false);
    }
});

/* CHECKOUT DEMO */

element("checkoutButton").addEventListener("click", () => {
    if (!cart.length) {
        alert("Your shopping bag is empty. Add a product first.");
        return;
    }

    const total = cart.reduce(
        (sum, item) => sum + Number(item.price || 0),
        0
    );

    alert(
        "Your shopping bag is ready!\n\n" +
        "Total: " + money(total) +
        "\n\nCheckout will be connected to the STITCHEASE backend in a future phase."
    );
});

/* =========================================
   CUSTOMISATION STUDIO
========================================= */

function getDesign() {
    return {
        Outfit: element("designOutfit").value,
        Fabric: element("designFabric").value,
        Colour: element("designColour").value,
        Neckline: element("designNeckline").value,
        Sleeve: element("designSleeve").value,
        Length: element("designLength").value,
        Embroidery: element("designEmbroidery").value,
        Occasion: element("designOccasion").value
    };
}

/* ESTIMATED CUSTOM DESIGN PRICE */

function estimatePrice() {
    const design = getDesign();

    let price = 1800;

    const fabricPrices = {
        Silk: 900,
        Cotton: 200,
        Georgette: 450,
        Velvet: 850,
        Chanderi: 700
    };

    const embroideryPrices = {
        None: 0,
        "Light zari": 600,
        "Heavy zari": 1800,
        "Thread work": 900,
        "Mirror work": 1100
    };

    price += fabricPrices[design.Fabric] || 0;
    price += embroideryPrices[design.Embroidery] || 0;

    if (design.Occasion === "Wedding") price += 700;
    if (design.Occasion === "Party") price += 300;
    if (design.Occasion === "Festive") price += 200;

    return price;
}

/* COLOUR PREVIEW */

function colourCode(colour) {
    const colours = {
        Maroon: "#70263C",
        Teal: "#167C80",
        Gold: "#B58B24",
        Navy: "#071B35",
        Ivory: "#D9D0BA",
        Emerald: "#08764C",
        Rose: "#C8798B"
    };

    return colours[colour] || "#071B35";
}

/* UPDATE DESIGN SUMMARY */

function updateDesignSummary() {
    const design = getDesign();

    element("designSummary").innerHTML =
        Object.entries(design).map(([key, value]) => `
            <div class="summary-item">
                <small>${key}</small>
                <strong>${value}</strong>
            </div>
        `).join("");

    element("designEstimate").textContent =
        money(estimatePrice());

    const preview = element("previewArt");

    preview.style.background =
        `linear-gradient(135deg, ${colourCode(design.Colour)}, #071B35)`;
}

/* UPDATE WHEN SELECTION CHANGES */

document.querySelectorAll("#designForm select").forEach(select => {
    select.addEventListener("change", updateDesignSummary);
});

/* DESIGN RECOMMENDATION DEMO */

element("recommendButton").addEventListener("click", () => {
    updateDesignSummary();

    const design = getDesign();

    alert(
        "Your design preferences are ready!\n\n" +
        "Outfit: " + design.Outfit + "\n" +
        "Fabric: " + design.Fabric + "\n" +
        "Colour: " + design.Colour + "\n" +
        "Embroidery: " + design.Embroidery + "\n" +
        "Occasion: " + design.Occasion + "\n\n" +
        "AI fashion recommendations can be connected in a future phase."
    );
});

/* SAVE DESIGN */

element("saveDesign").addEventListener("click", () => {
    const design = getDesign();

    savedDesigns.push({
        id: Date.now(),
        details: design,
        price: estimatePrice()
    });

    localStorage.setItem(
        "stitcheaseSavedDesigns",
        JSON.stringify(savedDesigns)
    );

    displaySavedDesigns();

    alert("Your design has been saved!");
});

/* ADD CUSTOM DESIGN TO CART */

element("addCustomToCart").addEventListener(
    "click",
    addCustomDesignToCart
);

/* DISPLAY SAVED DESIGNS */

function displaySavedDesigns() {
    const container = element("savedDesigns");

    if (!savedDesigns.length) {
        container.innerHTML = `
            <div class="saved-empty">
                <span>♡</span>
                <p>No saved designs yet.</p>
                <small>Create a design in the studio and select Save design.</small>
            </div>
        `;
        return;
    }

    container.innerHTML = savedDesigns.map(item => `
        <article class="saved-card">
            <h3>${item.details.Outfit}</h3>

            <p>
                ${item.details.Fabric} · ${item.details.Colour}<br>
                ${item.details.Embroidery} · ${item.details.Occasion}
            </p>

            <strong>${money(item.price)}</strong>

            <button onclick="deleteSavedDesign(${item.id})">
                Remove design
            </button>
        </article>
    `).join("");
}

/* DELETE SAVED DESIGN */

function deleteSavedDesign(id) {
    savedDesigns = savedDesigns.filter(
        item => item.id !== id
    );

    localStorage.setItem(
        "stitcheaseSavedDesigns",
        JSON.stringify(savedDesigns)
    );

    displaySavedDesigns();
}

/* =========================================
   FASHION ASSISTANT - FRONTEND DEMO
========================================= */

function addChatMessage(message, type) {
    const chat = element("chatMessages");
    const bubble = document.createElement("div");

    bubble.className = "chat-message " + type;
    bubble.textContent = message;

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
}

function sendChatMessage(message) {
    if (!message.trim()) return;

    addChatMessage(message, "user-message");

    addChatMessage(
        "Thank you for sharing! I can help you explore outfit ideas, colours, fabrics and styling inspiration. Personalised AI responses can be connected to the backend in a future phase.",
        "assistant-message"
    );
}

element("chatForm").addEventListener("submit", event => {
    event.preventDefault();

    const input = element("chatInput");

    sendChatMessage(input.value);
    input.value = "";
});

document.querySelectorAll(".suggestion").forEach(button => {
    button.addEventListener("click", () => {
        sendChatMessage(button.textContent);
    });
});

/* =========================================
   INSPIRATION IMAGE PREVIEW
========================================= */

element("inspirationUpload").addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        element("visualPreview").innerHTML = "";

        const image = document.createElement("img");
        image.src = reader.result;
        image.alt = "Your inspiration image";

        element("visualPreview").appendChild(image);
    };

    reader.readAsDataURL(file);
});

/* PREPARE DESIGN IDEA */

element("generateConcept").addEventListener("click", () => {
    const file = element("inspirationUpload").files[0];

    if (!file) {
        alert("Please upload an inspiration image first.");
        return;
    }

    alert(
        "Your inspiration image has been uploaded successfully!\n\n" +
        "Your reference is ready for the design process. AI outfit image generation can be integrated in a future phase."
    );
});

/* =========================================
   HOMEPAGE ACCOUNT NAVIGATION
========================================= */

function goToAccount(section) {
    sessionStorage.setItem(
        "stitcheaseReturnSection",
        section
    );

    return true;
}

/* =========================================
   INITIALISE PAGE
========================================= */

displayProducts();
updateDesignSummary();
displaySavedDesigns();
updateCart();
