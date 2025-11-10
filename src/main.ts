// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// Create basic UI elements

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const SCREEN_WIDTH = 34;
const SCREEN_HEIGHT = 12;
const PERCENT_CHANCE = 0.30;

//Singular Variables
//let inventory = 0;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's points
//let tokenValue = 0;
statusPanelDiv.innerHTML = "No points yet...";

// Add cells to the map by cell numbers
function spawnCell(x: number, y: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = CLASSROOM_LATLNG;
  const bounds = leaflet.latLngBounds([
    [origin.lat + y * TILE_DEGREES, origin.lng + x * TILE_DEGREES],
    [origin.lat + (y + 1) * TILE_DEGREES, origin.lng + (x + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  const myIcon = leaflet.divIcon({ className: "my-div-icon", html: "0" });

  if (luck([x, y].toString()) < PERCENT_CHANCE) {
    myIcon.options.html = "1";
  }

  // you can set .my-div-icon styles in CSS

  const marker = leaflet.marker([
    origin.lat + (y + 0.5) * TILE_DEGREES,
    origin.lng + (x + 0.5) * TILE_DEGREES,
  ], { icon: myIcon, interactive: false }).addTo(map);

  rect.on("click", () => {
    const element = marker.getElement();
    if (element) {
      element.innerHTML = "1";
    }
  });
}

// Look around the player's neighborhood for caches to spawn
for (let x = -SCREEN_WIDTH; x < SCREEN_WIDTH; x++) {
  for (let y = -SCREEN_HEIGHT; y < SCREEN_HEIGHT; y++) {
    // If location i,j is lucky enough, spawn a cache!
    spawnCell(x, y);
  }
}
