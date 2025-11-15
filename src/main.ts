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
const PERCENT_CHANCE = 0.30;

//Singular Variable
let inventory = 0;
let lastLat: number | null = null;
let lastLng: number | null = null;
let lastUpdateTime = 0;
const THROTTLE_MS = 1000; //max once per second
const Starting_X = Math.floor(CLASSROOM_LATLNG.lng / TILE_DEGREES);
const Starting_Y = Math.floor(CLASSROOM_LATLNG.lat / TILE_DEGREES);
const currentLocation = { x: Starting_X, y: Starting_Y };
const onScreenCells: Cell[] = [];

//persistent world state: only stores cells that have been changed by the player
const worldState = new Map<string, number>();

//lets test if I can cross the equator and prime meridian, as well as far distance

/*
Lets test the Equator first
- Can I move smoothly and do cells still spawn? (yes they do!)
const testX = Math.floor(-55 / TILE_DEGREES); //Amazon Rainforest
const testY = Math.floor(0.001 / TILE_DEGREES);
const currentLocation = { x: testX, y: testY };
*/

/*
Lets test the Prime Meridian
- Can I move smoothly and do cells still spawn? (yes they do!)
const testX = Math.floor(0.001 / TILE_DEGREES);
const testY = Math.floor(51.5 / TILE_DEGREES); //london
const currentLocation = { x: testX, y: testY };
*/

/*
Lets test from a far distance now, like tokyo
-can I move smoothly and do cells still spawn? (yes they do!)
const testX = Math.floor(139.691 / TILE_DEGREES); //Tokyo
const testY = Math.floor(35.689 / TILE_DEGREES);
const currentLocation = { x: testX, y: testY };
*/

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: [currentLocation.y * TILE_DEGREES, currentLocation.x * TILE_DEGREES],
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

//first define the interface of cell
interface Cell {
  rectangle: leaflet.Rectangle;
  marker: leaflet.Marker;
  xCoord: number;
  yCoord: number;
  value: number;
}

//button UI lay out all my movement buttons
const northButton = document.createElement("button");
northButton.textContent = "↑ North";
northButton.id = "northButton";
controlPanelDiv.appendChild(northButton);

const southButton = document.createElement("button");
southButton.textContent = "↓ South";
southButton.id = "southButton";
controlPanelDiv.appendChild(southButton);

const eastButton = document.createElement("button");
eastButton.textContent = "-> East";
eastButton.id = "eastButton";
controlPanelDiv.appendChild(eastButton);

const westButton = document.createElement("button");
westButton.textContent = "<- West";
westButton.id = "westButton";
controlPanelDiv.appendChild(westButton);

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker([
  currentLocation.y * TILE_DEGREES,
  currentLocation.x * TILE_DEGREES,
]);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's points
//let tokenValue = 0;
statusPanelDiv.innerHTML = "No points yet...";

//a helper function that will convert world  coords to a grid-aligned key string
function getCellKey(x: number, y: number): string {
  return `${x}, ${y}`;
}

// Add cells to the map by cell numbers
function spawnCell(x: number, y: number) {
  // Convert cell numbers into lat/lng bounds
  const lat = y * TILE_DEGREES;
  const lng = x * TILE_DEGREES;
  const bounds = leaflet.latLngBounds([
    [lat, lng],
    [lat + TILE_DEGREES, lng + TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  //create a value variable that stores the value in the cell
  let value: number;
  const key = getCellKey(x, y);

  //spawn our values creating cells of 0's and 1's but its consistant upon reloads
  //if the value has been changed or touched add to worldstate
  if (worldState.has(key)) {
    value = worldState.get(key)!;
  } else { //otherwise generate from luck
    value = luck([x, y].toString()) < PERCENT_CHANCE ? 1 : 0;
  }

  //icon in my marker is text so it appears
  const myIcon = leaflet.divIcon({
    className: "my-div-icon",
    html: value.toString(),
  });

  // you can set .my-div-icon styles in CSS

  const marker = leaflet.marker([
    lat + TILE_DEGREES / 2,
    lng + TILE_DEGREES / 2,
  ], { icon: myIcon, interactive: false }).addTo(map);

  //store all the variables in a cell here
  const cell: Cell = {
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
        //add to worldState if pickedup
        worldState.set(getCellKey(cell.xCoord, cell.yCoord), cell.value);
      } else if (cell.value == inventory) {
        cell.value = cell.value + inventory;
        inventory = 0;
        statusPanelDiv.innerHTML = "No points yet...";
        //add to worldstate if crafted
        worldState.set(getCellKey(cell.xCoord, cell.yCoord), cell.value);
      } else if (cell.value == 0) {
        cell.value = inventory;
        inventory = 0;
        statusPanelDiv.innerHTML = "No points yet...";
        //add to world state if placed in an empty cell
        worldState.set(getCellKey(cell.xCoord, cell.yCoord), cell.value);
      }

      //edit the html to display the new correct token value
      const element = marker.getElement();
      if (element) {
        element.innerHTML = cell.value.toString();
      }
    }
    //add my win condition here
    if (inventory == 16) {
      statusPanelDiv.innerHTML = "You WIN!!!!";
    }
  });
}

map.on("move", updateVisibleCells);

//allow cells to spawn via scrolling on the map
function updateVisibleCells() {
  //get current view bounds
  const bounds = map.getBounds();
  const south = Math.floor(bounds.getSouth() / TILE_DEGREES);
  const north = Math.floor(bounds.getNorth() / TILE_DEGREES);
  const west = Math.floor(bounds.getWest() / TILE_DEGREES);
  const east = Math.floor(bounds.getEast() / TILE_DEGREES);

  //clear and redraw
  for (const cell of onScreenCells) {
    cell.rectangle.removeFrom(map);
    cell.marker.removeFrom(map);
  }

  onScreenCells.length = 0;

  //spawn cells across the visiable
  for (let y = south; y <= north; y++) {
    for (let x = west; x <= east; x++) {
      spawnCell(x, y);
    }
  }
}

//Player movement function, takes in the x and y value on the grid and moves the player that many spaces
function playerMovement(dx: number, dy: number) {
  //update the logical position
  currentLocation.x = currentLocation.x + dx;
  currentLocation.y = currentLocation.y + dy;

  //convert the grid coords to actual lat/lng
  const newLat = currentLocation.y * TILE_DEGREES;
  const newLng = currentLocation.x * TILE_DEGREES;

  //move the player marer to the new position
  playerMarker.setLatLng([newLat, newLng]);

  //will always center around the player
  map.setView([newLat, newLng]);

  //redraw the grid upon movement
  updateVisibleCells();
}

//call playermovement when putton is pressed to simulate movement
northButton.addEventListener("click", () => {
  playerMovement(0, 1);
});

southButton.addEventListener("click", () => {
  playerMovement(0, -1);
});

eastButton.addEventListener("click", () => {
  playerMovement(1, 0);
});

westButton.addEventListener("click", () => {
  playerMovement(-1, 0);
});

if ("geolocation" in navigator) {
  console.log("geolocation avalible, converting movement to grid steps...");
  navigator.geolocation.watchPosition(
    (position) => {
      //get the current location of the player
      const { latitude, longitude } = position.coords;
      currentLocation.x = Math.floor(longitude / TILE_DEGREES);
      currentLocation.y = Math.floor(latitude / TILE_DEGREES);

      map.setView([latitude, longitude], GAMEPLAY_ZOOM_LEVEL);
      playerMarker.setLatLng([latitude, longitude]);
      updateVisibleCells();

      const now = Date.now();
      if (now - lastUpdateTime < THROTTLE_MS) {
        return; //throttles
      }
      lastUpdateTime = now;

      const { latitude: lat, longitude: lng } = position.coords;

      //store postition
      if (lastLat === null || lastLng === null) {
        console.log("first postition locked:", { lat, lng });
        lastLat = lat;
        lastLng = lng;
        return;
      }

      //calculate delta in degrees
      const deltaLat = lat - lastLat;
      const deltaLng = lng - lastLng;

      //convert to grid units (TILE_DEGREES = 1e-4 -> ~10 meters per tile)
      const dx = Math.round(deltaLng / TILE_DEGREES);
      const dy = Math.round(deltaLat / TILE_DEGREES);

      //Ignore tiny movements (or noise)
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        return;
      }

      //clamp movement to one tile max in any direction
      const stepX = Math.abs(dx) > 0 ? (dx > 0 ? 1 : -1) : 0;
      const stepY = Math.abs(dy) > 0 ? (dy > 0 ? 1 : -1) : 0;

      console.log(
        "Real-world move detected:",
        { stepX, stepY },
        "updating player...",
      );
      playerMovement(stepX, stepY);

      //update last position
      lastLat = lat;
      lastLng = lng;
    },
    (error) => {
      if (error.code === error.TIMEOUT) {
        console.warn("Timeout — try refreshing or adjusting DevTools.");
      } else if (error.code === error.PERMISSION_DENIED) {
        console.warn("Permission denied — reload and allow location.");
      } else {
        console.warn("Unexpected geolocation error:", error);
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    },
  );
} else {
  console.log("Browser does not support geolocation");
}

// Look around the player's neighborhood for caches to spawn
//worked but now we have redraw grid so this is no longer needed since it spawns at a fixed
/*
for (let x = -SCREEN_WIDTH; x < SCREEN_WIDTH; x++) {
  for (let y = -SCREEN_HEIGHT; y < SCREEN_HEIGHT; y++) {
    // If location i,j is lucky enough, spawn a cache!
    spawnCell(x, y);
  }
}
*/

//now we just call the redraw grid function to start up
updateVisibleCells();
