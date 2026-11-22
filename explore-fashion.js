
/* =========================================
   STITCHEASE - CUSTOMISATION STUDIO
   Updated outfit previews + Saved Designs
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
    { name: "Ivory", value: "#D9D0BA" },
    { name: "Gold", value: "#D6A400" }
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

let fitPreference = "Regular";
let measurements = readSavedMeasurements();
let savedDesigns = readSavedDesigns();
let toastTimer = null;

/* NEW: Price stays hidden until customisation begins. */
let hasStartedDesigning = false;


/* =========================================
   REMOVE OLD PHOTO AND FACE FEATURES
========================================= */

function removeUnwantedFeatures() {
    ["referenceUpload", "faceUpload"].forEach(id => {
        const input = $(id);

        if (input) {
            const card = input.closest(".ai-card");
            if (card) card.remove();
        }
    });

    document.querySelectorAll(
        ".reference-upload, .reference-preview, .face-preview, .face-result, .face-progress"
    ).forEach(element => {
        const card = element.closest(".ai-card");

        if (card) {
            card.remove();
        } else {
            element.remove();
        }
    });

    const aiPanel = document.querySelector(".ai-panel");

    if (aiPanel) {
        const heading = aiPanel.querySelector(".panel-heading");

        if (heading) {
            const title = heading.querySelector("h2");
            const description = heading.querySelector("p");

            if (title) title.textContent = "Style Studio";

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
    } catch (error) {
        console.error("Could not read saved designs:", error);
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
    } catch (error) {
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
   TOAST MESSAGE
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

            hasStartedDesigning = true;

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

            hasStartedDesigning = true;

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
        measurements = {
            ...emptyMeasurements,
            ...getMeasurementValuesFromInputs()
        };

        fitPreference = $("fitPreference")?.value || "Regular";

        saveMeasurementsToStorage();
        renderDesign();

        const enteredCount = Object.values(measurements).filter(
            value => value !== null
        ).length;

        if (enteredCount === 0) {
            if ($("measurementStatus")) {
                $("measurementStatus").textContent =
                    "No measurements entered. The preview is using standard proportions.";
            }

            if (showMessage) {
                showToast("Enter measurements to personalise your preview.");
            }

            return true;
        }

        if ($("measurementStatus")) {
            $("measurementStatus").textContent =
                `${enteredCount} measurement(s) applied. Your preview has been adjusted.`;
        }

        if (showMessage) {
            showToast("Your measurements have been applied!");
        }

        return true;

    } catch (error) {
        if ($("measurementStatus")) {
            $("measurementStatus").textContent = error.message;
        }

        if (showMessage) showToast(error.message);

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

    if ($("measurementStatus")) {
        $("measurementStatus").textContent =
            "Measurements cleared. The preview is using standard proportions.";
    }

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

    return { widthScale, lengthScale, sleeveScale };
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
    if (!group) return null;

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

function getPatternFill() {
    if (design.print === "Gold dots") {
        return "url(#dotPattern)";
    }

    if (design.print === "Floral") {
        return "url(#flowerPattern)";
    }

    return "none";
}

function addBottomGarment(pathData, colour) {
    const group = getOrCreateBottomGroup();
    if (!group) return;

    group.appendChild(createSVGElement("path", {
        d: pathData,
        fill: colour,
        stroke: "rgba(0,0,0,0.12)",
        "stroke-width": "1.2",
        "stroke-linejoin": "round"
    }));

    group.appendChild(createSVGElement("path", {
        d: pathData,
        fill: getPatternFill(),
        "pointer-events": "none"
    }));
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
        L160 166
        L170 207
        L90 207
        L100 166
        Z
    `;
}

function getCoOrdTopPath() {
    return `
        M92 103
        Q130 91 168 103
        L160 166
        L170 207
        L90 207
        L100 166
        Z
    `;
}

function getCoOrdBottomPaths() {
    return [
        `
        M83 231
        Q102 226 124 231
        L119 270
        L113 420
        L78 420
        L73 275
        Z
        `,
        `
        M136 231
        Q158 226 177 231
        L187 275
        L182 420
        L147 420
        L141 270
        Z
        `
    ];
}

function getLehengaSkirtPath() {
    return `
        M87 231
        Q130 243 173 231
        Q180 285 207 405
        Q130 425 53 405
        Q80 285 87 231
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
   OUTFIT DETAILS
========================================= */

function addOutfitDetails() {
    const group = $("garmentGroup");
    if (!group) return;

    let detailGroup = $("outfitDetailGroup");

    if (!detailGroup) {
        detailGroup = createSVGElement("g", {
            id: "outfitDetailGroup",
            fill: "none",
            stroke: "#FCE9A5",
            "stroke-width": "2",
            "stroke-linecap": "round"
        });

        group.appendChild(detailGroup);
    }

    detailGroup.innerHTML = "";

    if (design.garment === "Co-ord set") {
        detailGroup.appendChild(createSVGElement("path", {
            d: "M91 207 Q130 214 169 207"
        }));

        detailGroup.appendChild(createSVGElement("path", {
            d: "M83 231 Q130 239 177 231"
        }));

    } else if (design.garment === "Lehenga") {
        detailGroup.appendChild(createSVGElement("path", {
            d: "M90 207 Q130 214 170 207"
        }));

        detailGroup.appendChild(createSVGElement("path", {
            d: "M87 231 Q130 243 173 231"
        }));

        detailGroup.appendChild(createSVGElement("path", {
            d: "M75 330 Q130 344 185 330",
            "stroke-width": "1.5"
        }));

    } else if (design.garment === "Kurti") {
        detailGroup.appendChild(createSVGElement("path", {
            d: "M100 170 Q130 180 160 170"
        }));
    }
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

        addBottomGarment(
            getLehengaSkirtPath(),
            colour
        );

    } else if (design.garment === "Co-ord set") {
        garmentPath = getCoOrdTopPath();

        const [leftLeg, rightLeg] = getCoOrdBottomPaths();

        addBottomGarment(leftLeg, colour);
        addBottomGarment(rightLeg, colour);

    } else {
        garmentPath = getKurtiPath();
    }

    garment.setAttribute("d", garmentPath);
    garment.setAttribute("fill", colour);

    pattern.setAttribute("d", garmentPath);
    pattern.setAttribute("fill", getPatternFill());

    const sleeves = getSleevePaths();

    if (leftSleeve) {
        leftSleeve.setAttribute("d", sleeves[0]);
        leftSleeve.setAttribute("fill", colour);
    }

    if (rightSleeve) {
        rightSleeve.setAttribute("d", sleeves[1]);
        rightSleeve.setAttribute("fill", colour);
    }

    if (neck) {
        neck.setAttribute("d", getNeckPath());
    }

    addOutfitDetails();
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

    /* UPDATED PRICE DISPLAY */
    if ($("estimatedPrice")) {
        $("estimatedPrice").textContent = hasStartedDesigning
            ? formatMoney(calculatePrice())
            : "Design your outfit to see the estimated price";
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

            if ($("styleSuggestion")) {
                $("styleSuggestion").textContent =
                    styleSuggestions[occasion] || "";
            }
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
   SAVED DESIGNS - DATA
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
        colourHex: design.colour,
        neckline: design.neckline,
        sleeves: design.sleeves,
        length: design.length,
        print: design.print,
        measurements: getMeasurementCopy()
    };
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}


/* =========================================
   SAVED DESIGN PREVIEW
========================================= */

function createSavedDesignPreview(item) {
    const d = item.details || {};

    const colour = /^#[0-9A-F]{6}$/i.test(d.colourHex || "")
        ? d.colourHex
        : colours.find(c => c.name === d.colour)?.value || "#0B3D5C";

    let outfit = "";

    if (d.garment === "Co-ord set") {
        outfit = `
            <path d="
                M65 35 Q100 20 135 35
                L130 80 L140 105
                L60 105 L70 80 Z"
                fill="${colour}"/>

            <path d="
                M60 122 Q78 117 94 122
                L90 145 L86 220
                L58 220 L55 145 Z"
                fill="${colour}"/>

            <path d="
                M106 122 Q122 117 140 122
                L145 145 L142 220
                L114 220 L110 145 Z"
                fill="${colour}"/>

            <path d="M60 105 Q100 112 140 105"
                fill="none" stroke="#FCE9A5" stroke-width="2"/>
        `;

    } else if (d.garment === "Lehenga") {
        outfit = `
            <path d="
                M65 35 Q100 20 135 35
                L130 80 L140 102
                L60 102 L70 80 Z"
                fill="${colour}"/>

            <path d="
                M65 120 Q100 132 135 120
                Q145 170 170 220
                Q100 235 30 220
                Q55 170 65 120 Z"
                fill="${colour}"/>

            <path d="M65 102 Q100 110 135 102"
                fill="none" stroke="#FCE9A5" stroke-width="2"/>
        `;

    } else {
        const bottom = d.garment === "Blouse" ? 145 : 220;

        outfit = `
            <path d="
                M65 35 Q100 20 135 35
                L130 90 L145 ${bottom}
                L55 ${bottom} L70 90 Z"
                fill="${colour}"/>
        `;
    }

    return `
        <svg viewBox="0 0 200 250"
            role="img"
            aria-label="${escapeHTML(d.garment || "Outfit")} preview"
            style="width:100%;height:210px;display:block;
            background:#F5F3EC;border-radius:14px;">
            <ellipse cx="100" cy="232" rx="65" ry="6" fill="#D9D0BA"/>
            ${outfit}
        </svg>
    `;
}


/* =========================================
   SAVE DESIGN
========================================= */

function saveCurrentDesign() {
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

    showToast("Your design has been saved!");
}

$("saveDesign")?.addEventListener("click", saveCurrentDesign);


/* =========================================
   DISPLAY SAVED DESIGNS GALLERY
========================================= */

function displaySavedDesigns() {
    const container = $("savedDesigns");
    if (!container) return;

    const count = $("savedCount");

    if (count) {
        count.textContent =
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

        const date = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("en-IN")
            : "";

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

                ${createSavedDesignPreview(item)}

                <div class="saved-card-content">

                    <h3>${escapeHTML(d.garment || "Custom outfit")}</h3>

                    <p>
                        ${escapeHTML(d.fabric || "")} ·
                        ${escapeHTML(d.colour || "")}
                    </p>

                    <p>
                        ${escapeHTML(d.neckline || "")} neckline ·
                        ${escapeHTML(d.sleeves || "")} sleeves
                    </p>

                    <p>
                        ${escapeHTML(d.length || "")} ·
                        ${escapeHTML(d.print || "")}
                    </p>

                    ${
                        measurementSummary.length
                            ? `<p><strong>Measurements:</strong><br>${measurementSummary.map(escapeHTML).join("<br>")}</p>`
                            : `<p>No measurements added.</p>`
                    }

                    <p>Fit: ${escapeHTML(m.fitPreference || "Regular")}</p>

                    <h3>${formatMoney(item.price || 0)}</h3>

                    <small>Saved on ${escapeHTML(date)}</small>

                    <div class="saved-card-actions">

                        <button
                            type="button"
                            class="gold-button"
                            data-edit-design="${Number(item.id)}">
                            Edit design
                        </button>

                        <button
                            type="button"
                            class="outline-button"
                            data-remove-design="${Number(item.id)}">
                            Delete
                        </button>

                    </div>

                </div>
            </article>
        `;
    }).join("");

    container.querySelectorAll("[data-remove-design]").forEach(button => {
        button.addEventListener("click", () => {
            removeSavedDesign(Number(button.dataset.removeDesign));
        });
    });

    container.querySelectorAll("[data-edit-design]").forEach(button => {
        button.addEventListener("click", () => {
            editSavedDesign(Number(button.dataset.editDesign));
        });
    });
}


/* =========================================
   DELETE SAVED DESIGN
========================================= */

function removeSavedDesign(id) {
    savedDesigns = savedDesigns.filter(item => item.id !== id);

    saveDesignsToStorage();
    displaySavedDesigns();

    showToast("Saved design deleted.");
}


/* =========================================
   EDIT SAVED DESIGN
========================================= */

function editSavedDesign(id) {
    const item = savedDesigns.find(item => item.id === id);

    if (!item || !item.details) return;

    const d = item.details;

    design.garment = d.garment || "Kurti";
    design.fabric = d.fabric || "Cotton";
    design.colourName = d.colour || "Navy";

    design.colour =
        d.colourHex ||
        colours.find(c => c.name === design.colourName)?.value ||
        "#0B3D5C";

    design.neckline = d.neckline || "Round";
    design.sleeves = d.sleeves || "Sleeveless";
    design.length = d.length || "Knee length";
    design.print = d.print || "Plain";

    measurements = {
        ...emptyMeasurements,
        ...(d.measurements || {})
    };

    fitPreference = d.measurements?.fitPreference || "Regular";

    document.querySelectorAll("[data-key]").forEach(button => {
        const key = button.dataset.key;

        if (Object.prototype.hasOwnProperty.call(design, key)) {
            button.classList.toggle(
                "active",
                button.dataset.value === design[key]
            );
        }
    });

    loadMeasurementsIntoInputs();
    createColourSwatches();

    /* Show price when loading an existing saved design. */
    hasStartedDesigning = true;

    renderDesign();

    showToast("Design loaded! You can continue customising it.");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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
