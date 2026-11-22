
/* =========================================
   STITCHEASE - CUSTOMISATION STUDIO
   Improved fashion preview
   Measurement-based proportions
   Price estimation
   AI style suggestions
   Saved designs
   Book a fitting
========================================= */

const $ = id => document.getElementById(id);

const SVG_NS = "http://www.w3.org/2000/svg";

const design = {
    garment: "Kurti",
    fabric: "Cotton",
    colour: "#0B3D5C",
    colourName: "Navy",
    neckline: "Round",
    sleeves: "Sleeveless",
    length: "Knee length",
    print: "Plain"
};

const colours = [
    { name: "Navy", value: "#0B3D5C" },
    { name: "Maroon", value: "#7A1F3D" },
    { name: "Emerald", value: "#0F6B4F" },
    { name: "Mustard", value: "#D9A441" },
    { name: "Blush", value: "#E8B4B8" },
    { name: "Black", value: "#252525" },
    { name: "Ivory", value: "#D9D0BA" }
];

const garmentPrices = {
    Kurti: 1499,
    Lehenga: 3999,
    Blouse: 899,
    "Co-ord set": 2499
};

const fabricPrices = {
    Cotton: 0,
    Silk: 900,
    Chanderi: 600,
    Georgette: 400
};

const measurementFields = {
    bust: "measureBust",
    waist: "measureWaist",
    hip: "measureHip",
    shoulder: "measureShoulder",
    sleeve: "measureSleeve",
    garmentLength: "measureLength"
};

const measurementLimits = {
    bust: [1, 100],
    waist: [1, 100],
    hip: [1, 100],
    shoulder: [1, 100],
    sleeve: [1, 100],
    garmentLength: [1, 100]
};

const emptyMeasurements = {
    bust: null,
    waist: null,
    hip: null,
    shoulder: null,
    sleeve: null,
    garmentLength: null
};

let savedDesigns = readSavedDesigns();
let measurements = readSavedMeasurements();
let fitPreference = "Regular";
let toastTimer = null;


/* =========================================
   REMOVE OLD REFERENCE AND FACE FEATURES
========================================= */

function removeUnwantedFeatures() {
    ["referenceUpload", "faceUpload"].forEach(id => {
        const input = $(id);

        if (input) {
            const card = input.closest(".ai-card");

            if (card) {
                card.remove();
            }
        }
    });

    const aiPanel = document.querySelector(".ai-panel");

    if (aiPanel) {
        const heading = aiPanel.querySelector(".panel-heading");

        if (heading) {
            const title = heading.querySelector("h2");

            if (title) {
                title.textContent = "Style Studio";
            }

            const description = heading.querySelector("p");

            if (description) {
                description.textContent =
                    "Ideas and inspiration for your design";
            }
        }
    }
}


/* =========================================
   STORAGE
========================================= */

function readSavedDesigns() {
    try {
        const data = JSON.parse(
            localStorage.getItem("stitcheaseSavedDesigns") || "[]"
        );

        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveDesignsToStorage() {
    try {
        localStorage.setItem(
            "stitcheaseSavedDesigns",
            JSON.stringify(savedDesigns)
        );
    } catch (error) {
        console.error("Could not save designs:", error);
        showToast("Could not save designs in this browser.");
    }
}

function readSavedMeasurements() {
    try {
        const data = JSON.parse(
            localStorage.getItem("stitcheaseMeasurements") || "{}"
        );

        if (data && data.values) {
            fitPreference = data.fitPreference || "Regular";
            return data.values;
        }

        return data && typeof data === "object" ? data : {};
    } catch {
        return {};
    }
}

function saveMeasurementsToStorage() {
    try {
        localStorage.setItem(
            "stitcheaseMeasurements",
            JSON.stringify({
                values: measurements,
                fitPreference
            })
        );
    } catch (error) {
        console.error("Could not save measurements:", error);
    }
}


/* =========================================
   TOAST
========================================= */

function showToast(message) {
    const toast = $("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}


/* =========================================
   COLOUR OPTIONS
========================================= */

function createColourSwatches() {
    const container = $("colourSwatches");

    if (!container) return;

    container.innerHTML = colours.map(colour => `
        <button
            type="button"
            class="swatch ${colour.value === design.colour ? "active" : ""}"
            data-colour="${colour.value}"
            style="background:${colour.value}"
            aria-label="${colour.name}"
            title="${colour.name}">
        </button>
    `).join("");

    container.querySelectorAll(".swatch").forEach(button => {
        button.addEventListener("click", () => {
            const selected = colours.find(
                colour => colour.value === button.dataset.colour
            );

            if (!selected) return;

            design.colour = selected.value;
            design.colourName = selected.name;

            createColourSwatches();
            renderDesign();
        });
    });
}


/* =========================================
   DESIGN OPTION BUTTONS
========================================= */

function initialiseDesignOptions() {
    document.querySelectorAll("[data-key]").forEach(button => {
        const key = button.dataset.key;

        if (Object.prototype.hasOwnProperty.call(design, key)) {
            button.classList.toggle(
                "active",
                button.dataset.value === design[key]
            );
        }

        button.addEventListener("click", () => {
            const optionKey = button.dataset.key;
            const value = button.dataset.value;

            if (!Object.prototype.hasOwnProperty.call(design, optionKey)) {
                return;
            }

            design[optionKey] = value;

            document.querySelectorAll(
                `[data-key="${optionKey}"]`
            ).forEach(option => {
                option.classList.toggle(
                    "active",
                    option.dataset.value === value
                );
            });

            renderDesign();
        });
    });
}


/* =========================================
   MEASUREMENTS
========================================= */

function getMeasurementLabel(key) {
    const labels = {
        bust: "Bust",
        waist: "Waist",
        hip: "Hip",
        shoulder: "Shoulder",
        sleeve: "Sleeve length",
        garmentLength: "Garment length"
    };

    return labels[key] || key;
}

function getMeasurementValuesFromInputs() {
    const values = {};

    for (const [key, elementId] of Object.entries(measurementFields)) {
        const input = $(elementId);

        if (!input) continue;

        const rawValue = input.value.trim();

        if (rawValue === "") {
            values[key] = null;
            continue;
        }

        const number = Number(rawValue);
        const [minimum, maximum] = measurementLimits[key];

        if (
            !Number.isFinite(number) ||
            number < minimum ||
            number > maximum
        ) {
            input.focus();

            throw new Error(
                `${getMeasurementLabel(key)} must be between ${minimum} and ${maximum} cm.`
            );
        }

        values[key] = number;
    }

    return values;
}

function loadMeasurementsIntoInputs() {
    for (const [key, elementId] of Object.entries(measurementFields)) {
        const input = $(elementId);

        if (!input) continue;

        const value = measurements[key];

        input.value =
            value === null || value === undefined ? "" : value;
    }

    if ($("fitPreference")) {
        $("fitPreference").value = fitPreference;
    }
}

function hasMeasurements() {
    return Object.values(measurements).some(
        value => value !== null &&
            value !== undefined &&
            value !== ""
    );
}

function applyMeasurements(showMessage = true) {
    try {
        measurements = getMeasurementValuesFromInputs();

        fitPreference =
            $("fitPreference")?.value || "Regular";

        saveMeasurementsToStorage();
        renderDesign();

        const enteredCount = Object.values(measurements).filter(
            value => value !== null
        ).length;

        if (enteredCount === 0) {
            $("measurementStatus").textContent =
                "No measurements entered. The preview is using standard proportions.";

            if (showMessage) {
                showToast("Enter measurements to personalise your preview.");
            }

            return true;
        }

        $("measurementStatus").textContent =
            `${enteredCount} measurement(s) applied. Your preview has been adjusted.`;

        if (showMessage) {
            showToast("Your measurements have been applied!");
        }

        return true;

    } catch (error) {
        if ($("measurementStatus")) {
            $("measurementStatus").textContent = error.message;
        }

        if (showMessage) {
            showToast(error.message);
        }

        return false;
    }
}

$("applyMeasurements")?.addEventListener("click", () => {
    applyMeasurements(true);
});

$("clearMeasurements")?.addEventListener("click", () => {
    measurements = { ...emptyMeasurements };
    fitPreference = "Regular";

    loadMeasurementsIntoInputs();
    saveMeasurementsToStorage();

    $("measurementStatus").textContent =
        "Measurements cleared. The preview is using standard proportions.";

    renderDesign();
    showToast("Measurements cleared.");
});

$("fitPreference")?.addEventListener("change", () => {
    applyMeasurements(false);
});


/* =========================================
   MEASUREMENT-BASED PROPORTIONS
========================================= */

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function getPreviewScales() {
    const bust = Number(measurements.bust) || 90;
    const waist = Number(measurements.waist) || 75;
    const hip = Number(measurements.hip) || 96;
    const shoulder = Number(measurements.shoulder) || 38;
    const garmentLength = Number(measurements.garmentLength) || 95;

    const bodyWidthScale = (
        (bust / 90) +
        (waist / 75) +
        (hip / 96)
    ) / 3;

    const shoulderScale = shoulder / 38;

    const fitScale = {
        Slim: 0.94,
        Regular: 1,
        Relaxed: 1.07
    }[fitPreference] || 1;

    const widthScale = clamp(
        ((bodyWidthScale * 0.8) + (shoulderScale * 0.2)) * fitScale,
        0.82,
        1.22
    );

    const lengthScale = clamp(
        garmentLength / 95,
        0.85,
        1.15
    );

    const sleeveLength = Number(measurements.sleeve) || 45;

    const sleeveScale = clamp(
        sleeveLength / 45,
        0.65,
        1.35
    );

    return {
        widthScale,
        lengthScale,
        sleeveScale
    };
}

function updateMeasurementPreview() {
    const group = $("garmentGroup");

    if (!group) return;

    const scales = getPreviewScales();

    group.setAttribute(
        "transform",
        `translate(130 103) scale(${scales.widthScale} ${scales.lengthScale}) translate(-130 -103)`
    );

    const sleeveTransform =
        `translate(0 108) scale(1 ${scales.sleeveScale}) translate(0 -108)`;

    $("leftSleeve")?.setAttribute("transform", sleeveTransform);
    $("rightSleeve")?.setAttribute("transform", sleeveTransform);

    if ($("previewCaption")) {
        $("previewCaption").textContent = hasMeasurements()
            ? `Measurement-adjusted preview · ${fitPreference} fit · Confirm final fit at boutique`
            : "Illustrative design preview · Final fit confirmed at the boutique";
    }

    if ($("previewBadge")) {
        $("previewBadge").textContent =
            hasMeasurements() ? "Personalised preview" : "Your design preview";
    }
}


/* =========================================
   SVG HELPERS
========================================= */

function createSVGElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    return element;
}

function getOrCreateBottomGroup() {
    const group = $("garmentGroup");

    let bottomGroup = $("separateBottom");

    if (!bottomGroup) {
        bottomGroup = createSVGElement("g", {
            id: "separateBottom"
        });

        group.insertBefore(bottomGroup, group.firstChild);
    }

    return bottomGroup;
}

function clearBottomGroup() {
    const group = $("separateBottom");

    if (group) {
        group.innerHTML = "";
    }
}

function addBottomGarment(pathData, colour) {
    const group = getOrCreateBottomGroup();

    const base = createSVGElement("path", {
        d: pathData,
        fill: colour,
        stroke: "rgba(0,0,0,0.08)",
        "stroke-width": "1"
    });

    const pattern = createSVGElement("path", {
        d: pathData,
        fill: getPatternFill(),
        "pointer-events": "none"
    });

    group.appendChild(base);
    group.appendChild(pattern);
}

function getPatternFill() {
    if (design.print === "Gold dots") {
        return "url(#dotPattern)";
    }

    if (design.print === "Floral") {
        return "url(#flowerPattern)";
    }

    return "none";
}


/* =========================================
   OUTFIT SHAPES
========================================= */

function getKurtiPath() {
    const lengths = {
        Short: 235,
        "Knee length": 325,
        Long: 365
    };

    const bottom = lengths[design.length] || 325;

    return `
        M92 103
        Q130 91 168 103
        L160 170
        L190 ${bottom}
        L70 ${bottom}
        L100 170
        Z
    `;
}

function getBlousePath() {
    return `
        M92 103
        Q130 91 168 103
        L160 170
        L174 238
        L86 238
        L100 170
        Z
    `;
}

function getCoOrdTopPath() {
    return `
        M92 103
        Q130 91 168 103
        L160 170
        L174 232
        L86 232
        L100 170
        Z
    `;
}

function getCoOrdBottomPaths() {
    return [
        `
        M86 226
        L126 226
        L120 425
        L88 425
        L76 285
        Z
        `,
        `
        M134 226
        L174 226
        L184 285
        L172 425
        L140 425
        Z
        `
    ];
}

function getLehengaPath() {
    return `
        M92 103
        Q130 91 168 103
        L160 170
        L205 365
        L55 365
        L100 170
        Z
    `;
}

function getSleevePaths() {
    const options = {
        Sleeveless: ["", ""],

        Short: [
            "M92 108 L68 139 L77 158 L108 128Z",
            "M168 108 L192 139 L183 158 L152 128Z"
        ],

        "Three-quarter": [
            "M92 108 L62 184 L78 195 L111 132Z",
            "M168 108 L198 184 L182 195 L149 132Z"
        ]
    };

    return options[design.sleeves] || options.Sleeveless;
}

function getNeckPath() {
    const options = {
        Round: "M111 101 Q130 128 149 101Z",
        "V-neck": "M111 101 L130 137 L149 101Z",
        Boat: "M94 106 Q130 122 166 106 Q130 96 94 106Z"
    };

    return options[design.neckline] || options.Round;
}


/* =========================================
   RENDER OUTFIT
========================================= */

function renderGarment() {
    const colour = design.colour;

    const garment = $("garmentShape");
    const pattern = $("garmentPattern");
    const leftSleeve = $("leftSleeve");
    const rightSleeve = $("rightSleeve");
    const neck = $("neckShape");

    if (!garment || !pattern) return;

    clearBottomGroup();

    let garmentPath;

    if (design.garment === "Blouse") {
        garmentPath = getBlousePath();
    } else if (design.garment === "Lehenga") {
        garmentPath = getBlousePath();

        const skirtPath = `
            M96 226
            Q130 238 164 226
            L205 365
            L55 365
            Z
        `;

        addBottomGarment(skirtPath, colour);

    } else if (design.garment === "Co-ord set") {
        garmentPath = getCoOrdTopPath();

        const [leftLeg, rightLeg] = getCoOrdBottomPaths();

        addBottomGarment(leftLeg, colour);
        addBottomGarment(rightLeg, colour);

        const bottomGroup = $("separateBottom");

        const waistBand = createSVGElement("path", {
            d: "M87 226 Q130 237 173 226 L174 239 Q130 250 86 239Z",
            fill: colour,
            stroke: "#FCE9A5",
            "stroke-width": "2"
        });

        bottomGroup.appendChild(waistBand);

    } else {
        garmentPath = getKurtiPath();
    }

    garment.setAttribute("d", garmentPath);
    garment.setAttribute("fill", colour);

    pattern.setAttribute("d", garmentPath);
    pattern.setAttribute("fill", getPatternFill());

    const sleeves = getSleevePaths();

    leftSleeve.setAttribute("d", sleeves[0]);
    rightSleeve.setAttribute("d", sleeves[1]);

    leftSleeve.setAttribute("fill", colour);
    rightSleeve.setAttribute("fill", colour);

    neck.setAttribute("d", getNeckPath());

    // Add a small gold waist detail for a more finished look.
    let waistDetail = $("waistDetail");

    if (!waistDetail) {
        waistDetail = createSVGElement("path", {
            id: "waistDetail",
            fill: "none",
            stroke: "#FCE9A5",
            "stroke-width": "2"
        });

        $("garmentGroup").appendChild(waistDetail);
    }

    if (
        design.garment === "Kurti" ||
        design.garment === "Lehenga" ||
        design.garment === "Co-ord set"
    ) {
        waistDetail.setAttribute(
            "d",
            design.garment === "Co-ord set"
                ? "M94 225 Q130 237 166 225"
                : "M100 170 Q130 180 160 170"
        );

        waistDetail.style.display = "block";
    } else {
        waistDetail.style.display = "none";
    }
}


/* =========================================
   PRICE ESTIMATION
========================================= */

function calculatePrice() {
    let price =
        (garmentPrices[design.garment] || 1499) +
        (fabricPrices[design.fabric] || 0);

    if (design.neckline === "Boat") price += 150;
    if (design.sleeves === "Short") price += 100;
    if (design.sleeves === "Three-quarter") price += 200;
    if (design.length === "Long") price += 250;
    if (design.length === "Short") price -= 100;
    if (design.print !== "Plain") price += 180;

    return Math.max(price, 0);
}

function formatMoney(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
}


/* =========================================
   COMPLETE LIVE PREVIEW
========================================= */

function renderDesign() {
    renderGarment();

    if ($("previewTitle")) {
        $("previewTitle").textContent =
            `${design.garment} in ${design.fabric}`;
    }

    if ($("selectedColour")) {
        $("selectedColour").textContent = design.colourName;
    }

    if ($("estimatedPrice")) {
        $("estimatedPrice").textContent =
            formatMoney(calculatePrice());
    }

    updateMeasurementPreview();

    const svg = $("outfitSvg");

    if (svg) {
        svg.classList.remove("pop");
        void svg.offsetWidth;
        svg.classList.add("pop");
    }
}


/* =========================================
   STYLE SUGGESTIONS
========================================= */

const styleSuggestions = {
    "Wedding guest":
        "Try a rich silk or Chanderi outfit with a boat neckline and elegant gold detailing. A deeper colour with statement earrings creates a graceful wedding look.",

    Festive:
        "A vibrant cotton or Chanderi outfit with floral or gold detailing is a lovely festive choice. Try a coordinated colour palette and traditional accessories.",

    Office:
        "Choose a comfortable cotton outfit in navy, ivory or muted colours. A simple neckline and minimal detailing will create a polished everyday look."
};

function initialiseStyleSuggestions() {
    document.querySelectorAll("[data-occasion]").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-occasion]").forEach(option => {
                option.classList.remove("active");
            });

            button.classList.add("active");

            const occasion = button.dataset.occasion;

            $("styleSuggestion").textContent =
                styleSuggestions[occasion] || "";
        });
    });

    const defaultSuggestion =
        document.querySelector("[data-occasion].active");

    if (defaultSuggestion && $("styleSuggestion")) {
        $("styleSuggestion").textContent =
            styleSuggestions[defaultSuggestion.dataset.occasion] || "";
    }
}


/* =========================================
   SAVE DESIGN
========================================= */

function getMeasurementCopy() {
    return {
        bust: measurements.bust ?? null,
        waist: measurements.waist ?? null,
        hip: measurements.hip ?? null,
        shoulder: measurements.shoulder ?? null,
        sleeve: measurements.sleeve ?? null,
        garmentLength: measurements.garmentLength ?? null,
        fitPreference
    };
}

function getDesignCopy() {
    return {
        garment: design.garment,
        fabric: design.fabric,
        colour: design.colourName,
        neckline: design.neckline,
        sleeves: design.sleeves,
        length: design.length,
        print: design.print,
        measurements: getMeasurementCopy()
    };
}

$("saveDesign")?.addEventListener("click", () => {
    if (!applyMeasurements(false)) return;

    const item = {
        id: Date.now(),
        details: getDesignCopy(),
        price: calculatePrice(),
        createdAt: new Date().toISOString()
    };

    savedDesigns.unshift(item);

    saveDesignsToStorage();
    displaySavedDesigns();

    showToast("Your design and measurements have been saved!");
});

function displaySavedDesigns() {
    const container = $("savedDesigns");

    if (!container) return;

    if ($("savedCount")) {
        $("savedCount").textContent =
            `${savedDesigns.length} ${savedDesigns.length === 1 ? "design" : "designs"} saved`;
    }

    if (!savedDesigns.length) {
        container.innerHTML = `
            <div class="empty-saved">
                <span>♡</span>
                <p>Your saved designs will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = savedDesigns.map(item => {
        const d = item.details || {};
        const m = d.measurements || {};

        const measurementSummary = [
            m.bust != null ? `Bust: ${m.bust} cm` : null,
            m.waist != null ? `Waist: ${m.waist} cm` : null,
            m.hip != null ? `Hip: ${m.hip} cm` : null,
            m.shoulder != null ? `Shoulder: ${m.shoulder} cm` : null,
            m.sleeve != null ? `Sleeve: ${m.sleeve} cm` : null,
            m.garmentLength != null ? `Length: ${m.garmentLength} cm` : null
        ].filter(Boolean);

        return `
            <article class="saved-card">
                <h3>${escapeHTML(d.garment || "Custom outfit")}</h3>

                <p>
                    ${escapeHTML(d.fabric || "")} · ${escapeHTML(d.colour || "")}<br>
                    ${escapeHTML(d.neckline || "")} neckline ·
                    ${escapeHTML(d.sleeves || "")} sleeves<br>
                    ${escapeHTML(d.length || "")} ·
                    ${escapeHTML(d.print || "")}
                </p>

                ${
                    measurementSummary.length
                        ? `<p><b>Measurements:</b><br>${measurementSummary.map(escapeHTML).join("<br>")}<br>Fit: ${escapeHTML(m.fitPreference || "Regular")}</p>`
                        : `<p>No measurements added.</p>`
                }

                <strong>${formatMoney(item.price || 0)}</strong>

                <button type="button" data-remove-design="${Number(item.id)}">
                    Remove design
                </button>
            </article>
        `;
    }).join("");

    container.querySelectorAll("[data-remove-design]").forEach(button => {
        button.addEventListener("click", () => {
            removeSavedDesign(Number(button.dataset.removeDesign));
        });
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function removeSavedDesign(id) {
    savedDesigns = savedDesigns.filter(item => item.id !== id);

    saveDesignsToStorage();
    displaySavedDesigns();

    showToast("Saved design removed.");
}


/* =========================================
   BOOK A FITTING
========================================= */

$("bookFitting")?.addEventListener("click", () => {
    if (!applyMeasurements(false)) return;

    const fittingDesign = {
        ...getDesignCopy(),
        estimatedPrice: calculatePrice()
    };

    sessionStorage.setItem(
        "stitcheaseReturnSection",
        "appointmentSection"
    );

    sessionStorage.setItem(
        "stitcheaseCustomDesign",
        JSON.stringify(fittingDesign)
    );

    showToast("Taking you to Stitchease to book your fitting...");

    setTimeout(() => {
        window.location.href = "/";
    }, 800);
});


/* =========================================
   INITIALISE MEASUREMENTS
========================================= */

function initialiseMeasurements() {
    measurements = {
        ...emptyMeasurements,
        ...measurements
    };

    // Keep only the supported fit choices.
    if (!["Regular", "Slim", "Relaxed"].includes(fitPreference)) {
        fitPreference = "Regular";
    }

    loadMeasurementsIntoInputs();

    if (hasMeasurements() && $("measurementStatus")) {
        $("measurementStatus").textContent =
            "Your previously saved measurements have been loaded.";
    }
}


/* =========================================
   START CUSTOMISATION STUDIO
========================================= */

function initialiseStudio() {
    removeUnwantedFeatures();

    initialiseMeasurements();
    initialiseDesignOptions();
    initialiseStyleSuggestions();

    createColourSwatches();
    renderDesign();
    displaySavedDesigns();
}

initialiseStudio();
