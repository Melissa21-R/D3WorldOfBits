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
let inventory = 0;
const currentLocation = { x: 0, y: 0 };
const onScreenCells = [];

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

  //create a value variable that stores the value in the cell
  let value = 0;

  //spawn our values creating cells of 0's and 1's but its consistant upon reloads
  if (luck([x, y].toString()) < PERCENT_CHANCE) {
    value = 1;
  }

  //icon in my marker is text so it appears
  const myIcon = leaflet.divIcon({
    className: "my-div-icon",
    html: value.toString(),
  });

  // you can set .my-div-icon styles in CSS

  const marker = leaflet.marker([
    origin.lat + (y + 0.5) * TILE_DEGREES,
    origin.lng + (x + 0.5) * TILE_DEGREES,
  ], { icon: myIcon, interactive: false }).addTo(map);

  //store all the variables in a cell here
  const cell = {
    rectangle: rect,
    marker: marker,
    xCoord: x,
    yCoord: y,
    value: value,
  };

  onScreenCells.push(cell);

  rect.on("click", () => {
    //take the distance using pythogoreum therom to make sure that you cant access a cell more than 3 cells away
    if (
      Math.sqrt(
        Math.pow(currentLocation.x - cell.xCoord, 2) +
          (Math.pow(currentLocation.y - cell.yCoord, 2)),
      ) <= 3
    ) {
      /*
      - inventory system if cell is not empty and you have no token already in hand pick up token
      - or if the cell value is equal to the value you in your inventory take then and craft them together
      - and lastly if the cell is empty take the token value in your hand and place it into the empty cell
      */
      if (cell.value != 0 && inventory == 0) {
        inventory = cell.value;
        cell.value = 0;
        statusPanelDiv.innerHTML = "Your tokens: " + inventory.toString();
      } else if (cell.value == inventory) {
        cell.value = cell.value + inventory;
        inventory = 0;
        statusPanelDiv.innerHTML = "No points yet...";
      } else if (cell.value == 0) {
        cell.value = inventory;
        inventory = 0;
        statusPanelDiv.innerHTML = "No points yet...";
      }

      //edit the html to display the new correct token value
      const element = marker.getElement();
      if (element) {
        element.innerHTML = cell.value.toString();
      }
    }
    //add my win condition here
    if (inventory == 8) {
      statusPanelDiv.innerHTML = "You WIN!!!!";
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
