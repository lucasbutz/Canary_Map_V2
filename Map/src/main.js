import "./style.css";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const Seattle = [-122.3321, 47.6062];

// ─── MAP INIT ───────────────────────────────────────────────────────────────
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/bright",
  center: Seattle,
  zoom: 11.15,
});

// ─── REPORT DATA ─────────────────────────────────────────────────────────────
const reports = [
  {
    coordinates: [-122.3321, 47.6562],
    description:
      "<strong>Test Pin</strong><p>Placeholder report near Wallingford.</p>",
  },
  {
    coordinates: [-122.3121, 47.6262],
    description:
      "<strong>Test Pin 2</strong><p>Placeholder report near First Hill.</p>",
  },
  {
    coordinates: [-122.3021, 47.6562],
    description:
      "<strong>Test Pin 3</strong><p>Placeholder report near UW IMA.</p>",
  },
  {
    coordinates: [-122.3021, 47.6402],
    description:
      "<strong>Test Pin 4</strong><p>Placeholder report near Montlake.</p>",
  },
];

function buildGeoJSON(reports) {
  return {
    type: "FeatureCollection",
    features: reports.map((r) => ({
      type: "Feature",
      properties: { description: r.description },
      geometry: { type: "Point", coordinates: r.coordinates },
    })),
  };
}

function refreshPins() {
  map.getSource("places").setData(buildGeoJSON(reports));
}

// ─── GEOCODING ───────────────────────────────────────────────────────────────
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.length) throw new Error("Address not found");
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
// need to make it so on m MacOS/ laptops cannot upload images from the past
document.body.insertAdjacentHTML(
  "beforeend",
  `
  <button id="open-report-btn">+ Report Activity</button>

  <div id="report-modal" class="modal-overlay hidden">
    <div class="modal-card">
      <button id="close-modal-btn" class="modal-close">✕</button>
      <h2>Report Activity</h2>

      <label for="report-address">Address or Intersection</label>
      <input id="report-address" type="text" placeholder="e.g. 4213 10th Ave, Seattle" />

      <label for="report-description">Description</label>
      <textarea id="report-description" rows="4" placeholder="What did you see?"></textarea>

      <label for="report-image">Photo (optional)</label>
      <input id="report-image" type="file" accept="image/*" capture="environment" />
      <div id="preview-container" class="preview-container">
        <span id="image-placeholder" class="preview-placeholder">Preview will appear here. A live uploaded picture is required in order to prevent fraudulent reports.</span>
        <img id="image-preview" class="image-preview hidden" alt="" />
      </div>

      <p id="modal-error" class="modal-error hidden">Could not find that address. Try being more specific.</p>

      <button id="submit-report-btn" class="submit-btn">Submit</button>
    </div>
  </div>
`,
);

// ─── MODAL LOGIC ─────────────────────────────────────────────────────────────
const modal = document.getElementById("report-modal");
const openBtn = document.getElementById("open-report-btn");
const closeBtn = document.getElementById("close-modal-btn");
const submitBtn = document.getElementById("submit-report-btn");
const errorMsg = document.getElementById("modal-error");
const imageInput = document.getElementById("report-image");
const imagePreview = document.getElementById("image-preview");
const imagePlaceholder = document.getElementById("image-placeholder");

openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
closeBtn.addEventListener("click", () => closeModal());

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.classList.remove("hidden");
  imagePlaceholder.classList.add("hidden");
});

function closeModal() {
  modal.classList.add("hidden");
  document.getElementById("report-address").value = "";
  document.getElementById("report-description").value = "";
  imageInput.value = "";
  imagePreview.src = "";
  imagePreview.classList.add("hidden");
  imagePlaceholder.classList.remove("hidden");
  errorMsg.classList.add("hidden");
}

// ─── SUBMIT HANDLER ──────────────────────────────────────────────────────────
submitBtn.addEventListener("click", async () => {
  const address = document.getElementById("report-address").value.trim();
  const description = document
    .getElementById("report-description")
    .value.trim();

  if (!address || !description) return;

  submitBtn.textContent = "Locating...";
  submitBtn.disabled = true;
  errorMsg.classList.add("hidden");

  try {
    const coords = await geocodeAddress(address);

    const file = imageInput.files[0];
    const imageHTML = file
      ? `<img src="${URL.createObjectURL(file)}" style="width:100%;margin-top:6px;border-radius:4px;" />`
      : "";

    reports.push({
      coordinates: coords,
      description: `<strong>Report</strong><p>${description}</p>${imageHTML}`,
    });
    refreshPins();

    map.flyTo({ center: coords, zoom: 14 });
    closeModal();
  } catch (err) {
    errorMsg.classList.remove("hidden");
  } finally {
    submitBtn.textContent = "Submit";
    submitBtn.disabled = false;
  }
});

// ─── MAP LOAD ────────────────────────────────────────────────────────────────
map.on("load", async () => {
  const image = await map.loadImage(
    "https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png",
  );
  map.addImage("custom-marker", image.data);

  map.addSource("places", {
    type: "geojson",
    data: buildGeoJSON(reports),
  });

  map.addLayer({
    id: "places",
    type: "symbol",
    source: "places",
    layout: {
      "icon-image": "custom-marker",
      "icon-overlap": "always",
    },
  });

  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  let currentFeatureCoordinates = undefined;

  map.on("mousemove", "places", (e) => {
    const featureCoordinates = e.features[0].geometry.coordinates.toString();
    if (currentFeatureCoordinates !== featureCoordinates) {
      currentFeatureCoordinates = featureCoordinates;
      map.getCanvas().style.cursor = "pointer";
      const coordinates = e.features[0].geometry.coordinates.slice();
      const description = e.features[0].properties.description;
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
      popup.setLngLat(coordinates).setHTML(description).addTo(map);
    }
  });

  map.on("mouseleave", "places", () => {
    currentFeatureCoordinates = undefined;
    map.getCanvas().style.cursor = "";
    popup.remove();
  });
});
