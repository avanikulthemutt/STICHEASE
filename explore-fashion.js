
/* =========================================
   STITCHEASE - CUSTOMISATION STUDIO
   Custom outfit preview
   Measurement-based proportions
   Price estimation
   AI style suggestions
   Reference photo colour extraction
   MediaPipe face analysis
   Saved designs
========================================= */

const $ = id => document.getElementById(id);

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
    bust: [40, 180],
    waist: [40, 180],
    hip: [40, 200],
    shoulder: [20, 65],
    sleeve: [0, 100],
    garmentLength: [20, 180]
};

let savedDesigns = readSavedDesigns();
let faceLandmarker = null;
let facePhoto = null;
let toastTimer = null;

let measurements = readSavedMeasurements();
let fitPreference = "Regular";


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
   TOAST MESSAGE
========================================= */

function showToast(message) {
    const toast = $("toast");

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
   OPTION BUTTONS
========================================= */

document.querySelectorAll("[data-key]").forEach(button => {
    button.addEventListener("click", () => {
        const key = button.dataset.key;
        const value = button.dataset.value;

        if (!Object.prototype.hasOwnProperty.call(design, key)) {
            return;
        }

        design[key] = value;

        document.querySelectorAll(`[data-key="${key}"]`).forEach(option => {
            option.classList.toggle(
                "active",
                option.dataset.value === value
            );
        });

        renderDesign();
    });
});


/* =========================================
   MEASUREMENTS
========================================= */

function getMeasurementValuesFromInputs() {
    const values = {};

    for (const [key, elementId] of Object.entries(measurementFields)) {
        const input = $(elementId);
        const rawValue = input.value.trim();

        if (rawValue === "") {
            values[key] = null;
            continue;
        }

        const number = Number(rawValue);
        const [minimum, maximum] = measurementLimits[key];

        if (!Number.isFinite(number) || number < minimum || number > maximum) {
            input.focus();

            throw new Error(
                `${getMeasurementLabel(key)} must be between ${minimum} and ${maximum} cm.`
            );
        }

        values[key] = number;
    }

    return values;
}

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

function loadMeasurementsIntoInputs() {
    for (const [key, elementId] of Object.entries(measurementFields)) {
        const input = $(elementId);
        const value = measurements[key];

        input.value = value === null || value === undefined ? "" : value;
    }

    $("fitPreference").value = fitPreference;
}

function hasMeasurements() {
    return Object.values(measurements).some(
        value => value !== null && value !== undefined && value !== ""
    );
}

function applyMeasurements(showMessage = true) {
    try {
        measurements = getMeasurementValuesFromInputs();
        fitPreference = $("fitPreference").value || "Regular";

        saveMeasurementsToStorage();
        renderDesign();

        const enteredCount = Object.values(measurements).filter(
            value => value !== null
        ).length;

        if (enteredCount === 0) {
            $("measurementStatus").textContent =
                "No measurements entered. The preview is using standard proportions.";

            if (showMessage) {
                showToast("Enter your measurements to personalise the preview.");
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
        $("measurementStatus").textContent = error.message;

        if (showMessage) {
            showToast(error.message);
        }

        return false;
    }
}

$("applyMeasurements").addEventListener("click", () => {
    applyMeasurements(true);
});

$("clearMeasurements").addEventListener("click", () => {
    measurements = {
        bust: null,
        waist: null,
        hip: null,
        shoulder: null,
        sleeve: null,
        garmentLength: null
    };

    fitPreference = "Regular";

    loadMeasurementsIntoInputs();
    saveMeasurementsToStorage();

    $("measurementStatus").textContent =
        "Measurements cleared. The preview is using standard proportions.";

    renderDesign();
    showToast("Measurements cleared.");
});

$("fitPreference").addEventListener("change", () => {
    fitPreference = $("fitPreference").value;
    applyMeasurements(false);
});


/* =========================================
   MEASUREMENT-BASED PREVIEW SCALE
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

    $("leftSleeve").setAttribute("transform", sleeveTransform);
    $("rightSleeve").setAttribute("transform", sleeveTransform);

    const caption = $("previewCaption");

    if (hasMeasurements()) {
        caption.textContent =
            `Measurement-adjusted preview · ${fitPreference} fit · Confirm final fit at boutique`;
    } else {
        caption.textContent =
            "Illustrative design preview · Final fit confirmed at the boutique";
    }

    $("previewBadge").textContent =
        hasMeasurements() ? "Personalised preview" : "Your design preview";
}


/* =========================================
   PRICE CALCULATION
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
   LIVE GARMENT PREVIEW
========================================= */

function renderDesign() {
    const colour = design.colour;

    const garment = $("garmentShape");
    const pattern = $("garmentPattern");
    const leftSleeve = $("leftSleeve");
    const rightSleeve = $("rightSleeve");
    const neck = $("neckShape");

    const garmentLength = {
        Short: 235,
        "Knee length": 325,
        Long: 365
    }[design.length];

    let garmentPath;

    if (design.garment === "Blouse") {
        garmentPath =
            "M92 103 Q130 91 168 103 L160 170 L174 238 L86 238 L100 170Z";
    } else if (design.garment === "Lehenga") {
        garmentPath =
            `M92 103 Q130 91 168 103 L160 170 L205 ${garmentLength} L55 ${garmentLength} L100 170Z`;
    } else if (design.garment === "Co-ord set") {
        garmentPath =
            "M92 103 Q130 91 168 103 L160 170 L174 240 L86 240 L100 170Z";
    } else {
        garmentPath =
            `M92 103 Q130 91 168 103 L160 170 L190 ${garmentLength} L70 ${garmentLength} L100 170Z`;
    }

    garment.setAttribute("d", garmentPath);
    garment.setAttribute("fill", colour);

    pattern.setAttribute("d", garmentPath);

    if (design.print === "Gold dots") {
        pattern.setAttribute("fill", "url(#dotPattern)");
    } else if (design.print === "Floral") {
        pattern.setAttribute("fill", "url(#flowerPattern)");
    } else {
        pattern.setAttribute("fill", "none");
    }

    const sleevePaths = {
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

    const sleeves = sleevePaths[design.sleeves];

    leftSleeve.setAttribute("d", sleeves[0]);
    rightSleeve.setAttribute("d", sleeves[1]);

    leftSleeve.setAttribute("fill", colour);
    rightSleeve.setAttribute("fill", colour);

    const neckPaths = {
        Round: "M111 101 Q130 128 149 101Z",
        "V-neck": "M111 101 L130 137 L149 101Z",
        Boat: "M94 106 Q130 122 166 106 Q130 96 94 106Z"
    };

    neck.setAttribute("d", neckPaths[design.neckline]);

    $("previewTitle").textContent =
        `${design.garment} in ${design.fabric}`;

    $("selectedColour").textContent = design.colourName;
    $("estimatedPrice").textContent = formatMoney(calculatePrice());

    updateMeasurementPreview();

    const svg = $("outfitSvg");

    svg.classList.remove("pop");
    void svg.offsetWidth;
    svg.classList.add("pop");
}


/* =========================================
   STYLE MATCH
========================================= */

const styleSuggestions = {
    "Wedding guest":
        "Try a rich silk or Chanderi outfit with a boat neckline and elegant gold detailing. A deeper colour with statement earrings creates a graceful wedding look.",

    Festive:
        "A vibrant cotton or Chanderi outfit with floral or gold detailing is a lovely festive choice. Try a coordinated colour palette and traditional accessories.",

    Office:
        "Choose a comfortable cotton outfit in navy, ivory or muted colours. A simple neckline and minimal detailing will create a polished everyday look."
};

document.querySelectorAll("[data-occasion]").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll("[data-occasion]").forEach(option => {
            option.classList.remove("active");
        });

        button.classList.add("active");

        $("styleSuggestion").textContent =
            styleSuggestions[button.dataset.occasion];
    });
});


/* =========================================
   REFERENCE PHOTO PREVIEW
========================================= */

$("referenceUpload").addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image.");
        event.target.value = "";
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast("Please choose an image smaller than 10 MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        const image = new Image();

        image.onload = () => {
            $("referenceImage").src = reader.result;
            $("referencePreview").hidden = false;

            extractImageColours(image);

            $("referenceStatus").textContent =
                "Reference image loaded. Main colours have been sampled.";
        };

        image.onerror = () => {
            $("referenceStatus").textContent =
                "Could not open this image. Please try another photo.";
        };

        image.src = reader.result;
    };

    reader.onerror = () => {
        $("referenceStatus").textContent =
            "Could not read this image. Please try again.";
    };

    reader.readAsDataURL(file);
});

function extractImageColours(image) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", {
        willReadFrequently: true
    });

    canvas.width = 50;
    canvas.height = 50;

    context.drawImage(image, 0, 0, 50, 50);

    const pixels = context.getImageData(0, 0, 50, 50).data;
    const buckets = {};

    for (let i = 0; i < pixels.length; i += 16) {
        const r = Math.min(Math.round(pixels[i] / 32) * 32, 255);
        const g = Math.min(Math.round(pixels[i + 1] / 32) * 32, 255);
        const b = Math.min(Math.round(pixels[i + 2] / 32) * 32, 255);

        const key = [r, g, b].join(",");
        buckets[key] = (buckets[key] || 0) + 1;
    }

    const dominant = Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(item => item[0]);

    $("referencePalette").innerHTML = dominant.map(rgb => `
        <span style="background:rgb(${rgb})" title="Sampled colour"></span>
    `).join("");
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

$("saveDesign").addEventListener("click", () => {
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

    $("savedCount").textContent =
        `${savedDesigns.length} ${savedDesigns.length === 1 ? "design" : "designs"} saved`;

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
                    ${escapeHTML(d.neckline || "")} neckline · ${escapeHTML(d.sleeves || "")} sleeves<br>
                    ${escapeHTML(d.length || "")} · ${escapeHTML(d.print || "")}
                </p>

                ${
                    measurementSummary.length
                        ? `<p class="saved-measurements"><b>Measurements:</b><br>${measurementSummary.map(escapeHTML).join("<br>")}<br>Fit: ${escapeHTML(m.fitPreference || "Regular")}</p>`
                        : `<p>No measurements added.</p>`
                }

                <strong>${formatMoney(item.price || 0)}</strong>

                <button type="button" onclick="removeSavedDesign(${Number(item.id)})">
                    Remove design
                </button>
            </article>
        `;
    }).join("");
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

$("bookFitting").addEventListener("click", () => {
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
   AI FACE DETECTOR
   MediaPipe Face Landmarker
========================================= */

async function loadFaceDetector() {
    if (faceLandmarker) return faceLandmarker;

    $("faceStatus").textContent =
        "Loading face detection model. Please wait...";

    const vision = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm"
    );

    const { FilesetResolver, FaceLandmarker } = vision;

    const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(
        fileset,
        {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "CPU"
            },
            runningMode: "IMAGE",
            numFaces: 1
        }
    );

    return faceLandmarker;
}


/* FACE PHOTO UPLOAD */

$("faceUpload").addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please upload a valid image.");
        event.target.value = "";
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast("Please upload an image smaller than 10 MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        const image = new Image();

        image.onload = () => {
            facePhoto = image;

            $("faceImage").src = reader.result;
            $("facePreview").hidden = false;
            $("faceResult").hidden = true;
            $("faceProgress").style.width = "0";

            const canvas = $("faceCanvas");
            const context = canvas.getContext("2d");

            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            context.clearRect(0, 0, canvas.width, canvas.height);

            $("faceStatus").textContent =
                "Photo uploaded. Select Analyse my face.";
        };

        image.onerror = () => {
            $("faceStatus").textContent =
                "Unable to load this photo. Try another image.";
        };

        image.src = reader.result;
    };

    reader.onerror = () => {
        $("faceStatus").textContent =
            "Could not read this photo. Please try again.";
    };

    reader.readAsDataURL(file);
});


/* LANDMARK DISTANCE */

function landmarkDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}


/* ESTIMATE FACE SHAPE */

function estimateFaceShape(landmarks) {
    const foreheadWidth = landmarkDistance(
        landmarks[127],
        landmarks[356]
    );

    const cheekWidth = landmarkDistance(
        landmarks[234],
        landmarks[454]
    );

    const jawWidth = landmarkDistance(
        landmarks[172],
        landmarks[397]
    );

    const faceHeight = landmarkDistance(
        landmarks[10],
        landmarks[152]
    );

    if (!cheekWidth || !faceHeight) return "Oval";

    const widthHeightRatio = cheekWidth / faceHeight;
    const foreheadRatio = foreheadWidth / cheekWidth;
    const jawRatio = jawWidth / cheekWidth;
    const heightRatio = faceHeight / cheekWidth;

    if (widthHeightRatio > 0.82 && jawRatio > 0.82) return "Round";
    if (jawRatio > 0.84 && foreheadRatio > 0.82) return "Square";
    if (heightRatio > 1.48) return "Oblong";
    if (foreheadRatio > 0.94 && jawRatio < 0.78) return "Heart";

    return "Oval";
}


/* DRAW FACE LANDMARKS */

function drawFaceLandmarks(landmarks) {
    const canvas = $("faceCanvas");
    const context = canvas.getContext("2d");

    const width = canvas.width;
    const height = canvas.height;

    context.clearRect(0, 0, width, height);

    const points = landmarks.map(point => ({
        x: point.x * width,
        y: point.y * height
    }));

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    points.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    });

    minX = Math.max(0, minX);
    maxX = Math.min(width, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(height, maxY);

    context.strokeStyle = "#FFC928";
    context.lineWidth = Math.max(3, width / 300);
    context.strokeRect(minX, minY, maxX - minX, maxY - minY);

    context.fillStyle = "#20D6A0";
    const radius = Math.max(1.5, width / 250);

    points.forEach(point => {
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
    });

    const label = "FACE DETECTED";
    context.font = `bold ${Math.max(14, width / 35)}px Arial`;

    const labelWidth = context.measureText(label).width;
    const labelHeight = Math.max(24, width / 20);
    const labelX = minX;
    const labelY = Math.max(labelHeight, minY - 8);

    context.fillStyle = "#071B35";
    context.fillRect(
        labelX,
        labelY - labelHeight,
        labelWidth + 16,
        labelHeight
    );

    context.fillStyle = "#FFC928";
    context.fillText(label, labelX + 8, labelY - 7);
}


/* FACE SHAPE STYLE SUGGESTIONS */

const faceRecommendations = {
    Oval: {
        description:
            "Your detected facial proportions appear relatively balanced. You can experiment with many traditional neckline and jewellery styles.",
        neckline: "Boat neck, V-neck and sweetheart neck",
        earrings: "Jhumkas, chandbalis and studs",
        tip: "Experiment with different blouse designs and saree drapes."
    },

    Round: {
        description:
            "Your detected facial proportions appear softer, with a relatively balanced width and height.",
        neckline: "V-neck and sweetheart neck",
        earrings: "Long jhumkas and drop earrings",
        tip: "Try longer earring styles and vertically detailed blouse designs."
    },

    Square: {
        description:
            "Your detected facial proportions appear to have a broader jawline and balanced facial width.",
        neckline: "Sweetheart and rounded necklines",
        earrings: "Curved chandbalis and rounded jhumkas",
        tip: "Try softer curves and delicate jewellery details."
    },

    Heart: {
        description:
            "Your detected facial proportions appear broader around the forehead and narrower towards the chin.",
        neckline: "Boat neck and wider necklines",
        earrings: "Chandbalis and wider statement earrings",
        tip: "Try balanced accessories and detailed blouse necklines."
    },

    Oblong: {
        description:
            "Your detected facial proportions appear longer than they are wide.",
        neckline: "Boat neck and square neck",
        earrings: "Wide jhumkas and statement chandbalis",
        tip: "Try wider jewellery styles and horizontal blouse details."
    }
};


/* RUN FACE ANALYSIS */

$("analyseFace").addEventListener("click", async () => {
    if (!facePhoto) {
        showToast("Please upload your photo first.");
        return;
    }

    const button = $("analyseFace");

    button.disabled = true;
    button.textContent = "Analysing...";

    $("faceResult").hidden = true;
    $("faceProgress").style.width = "20%";
    $("faceStatus").textContent =
        "Preparing the AI face detector...";

    try {
        const detector = await loadFaceDetector();

        $("faceProgress").style.width = "60%";
        $("faceStatus").textContent =
            "Detecting facial landmarks...";

        const result = detector.detect(facePhoto);

        if (!result.faceLandmarks || !result.faceLandmarks.length) {
            const canvas = $("faceCanvas");

            canvas.getContext("2d").clearRect(
                0, 0, canvas.width, canvas.height
            );

            $("faceStatus").textContent =
                "No face detected. Please use a clear, front-facing photo with good lighting.";

            $("faceProgress").style.width = "0";
            return;
        }

        const landmarks = result.faceLandmarks[0];

        drawFaceLandmarks(landmarks);

        const shape = estimateFaceShape(landmarks);
        const suggestion = faceRecommendations[shape];

        $("faceShape").textContent =
            `Estimated ${shape} face shape`;

        $("faceDescription").textContent =
            suggestion.description;

        $("faceNeckline").textContent =
            suggestion.neckline;

        $("faceEarrings").textContent =
            suggestion.earrings;

        $("faceTip").textContent =
            suggestion.tip;

        $("faceProgress").style.width = "100%";
        $("faceStatus").textContent =
            "Face detected. Your styling suggestions are ready.";

        $("faceResult").hidden = false;

    } catch (error) {
        console.error("Face analysis error:", error);

        $("faceProgress").style.width = "0";

        $("faceStatus").textContent =
            "Could not load the face detector. Check your internet connection and try again.";

        showToast("Face detection failed. Please try again.");

    } finally {
        button.disabled = false;
        button.textContent = "Analyse my face";
    }
});


/* =========================================
   INITIALISE
========================================= */

function initialiseMeasurements() {
    if (measurements.values) {
        fitPreference = measurements.fitPreference || "Regular";
        measurements = measurements.values;
    }

    measurements = {
        bust: measurements.bust ?? null,
        waist: measurements.waist ?? null,
        hip: measurements.hip ?? null,
        shoulder: measurements.shoulder ?? null,
        sleeve: measurements.sleeve ?? null,
        garmentLength: measurements.garmentLength ?? null
    };

    loadMeasurementsIntoInputs();

    if (hasMeasurements()) {
        $("measurementStatus").textContent =
            "Your previously saved measurements have been loaded.";
    }
}

initialiseMeasurements();
createColourSwatches();
renderDesign();
displaySavedDesigns();
