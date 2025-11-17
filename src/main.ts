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
const THROTTLE_MS = 1000; //max once per second

const currentLocation = { x: 0, y: 0 };
const onScreenCells: Cell[] = [];
const urlParams = new URLSearchParams(globalThis.location.search);
const movementMode = urlParams.get("movement") || "button";
let movementController: MovementController | null = null;

//persistent world state: only stores cells that have been changed by the player
const worldState = new Map<string, number>();
const savedState = loadState();

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: [currentLocation.y * TILE_DEGREES, currentLocation.x * TILE_DEGREES],
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

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

const toggleButton = document.createElement("button");
toggleButton.textContent = movementMode === "geolocation"
  ? "Switch to Buttons"
  : "Switch to GPS";
controlPanelDiv.appendChild(toggleButton);

const newGameButton = document.createElement("button");
newGameButton.textContent = "New Game";
controlPanelDiv.appendChild(newGameButton);

// Add a marker to represent the player
const playerMarker = leaflet.marker([
  currentLocation.y * TILE_DEGREES,
  currentLocation.x * TILE_DEGREES,
]);

//first define the interface of cell
interface Cell {
  rectangle: leaflet.Rectangle;
  marker: leaflet.Marker;
  xCoord: number;
  yCoord: number;
  value: number;
}

interface MovementController {
  subscribe(callback: (dx: number, dy: number) => void): void;
  unsubscribe(callback: (dx: number, dy: number) => void): void;
}

//set game state to save
type GameState = {
  playerPosition: { x: number; y: number };
  inventory: number;
  movementMode: string;
  worldState: [string, number][];
};

//display playerMarker
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's points
//let tokenValue = 0;
statusPanelDiv.innerHTML = "No held Token...";

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

//truns button clics into grid-based movement events
class ButtonMovementController implements MovementController {
  //keeps a list of functions that want to be notofied when movement happens
  private callbacks: ((dx: number, dy: number) => void)[] = [];

  //another part of the game signs up to be told when buttons are pressed
  subscribe(callback: (dx: number, dy: number) => void) {
    this.callbacks.push(callback);
  }

  //remove a function from the mailing list
  //good for when switching input modes or cleaning up.
  unsubscribe(callback: (dx: number, dy: number) => void) {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  //send a movement event to everyone whos listening
  //called when button is clicked
  private emit(dx: number, dy: number) {
    this.callbacks.forEach((cb) => cb(dx, dy));
  }

  //set up event listeners on the four direction buttons
  init() {
    const north = document.getElementById("northButton")!;
    const south = document.getElementById("southButton")!;
    const east = document.getElementById("eastButton")!;
    const west = document.getElementById("westButton")!;

    north.addEventListener("click", () => this.emit(0, 1));
    south.addEventListener("click", () => this.emit(0, -1));
    east.addEventListener("click", () => this.emit(1, 0));
    west.addEventListener("click", () => this.emit(-1, 0));
  }
}

class GeolocationMovementController implements MovementController {
  private callbacks: ((dx: number, dy: number) => void)[] = [];
  private watchId: number | null = null;
  private lastUpdateTime = 0;
  private readonly THROTTLE_MS = 1000;

  subscribe(callback: (dx: number, dy: number) => void): void {
    this.callbacks.push(callback);
  }

  unsubscribe(callback: (dx: number, dy: number) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) this.callbacks.splice(index, 1);
  }

  private emit(dx: number, dy: number) {
    this.callbacks.forEach((cb) => cb(dx, dy));
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  start() {
    if ("geolocation" in navigator) {
      console.log("geolocation avalible, converting movement to grid steps...");
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          const now = Date.now();
          if (now - this.lastUpdateTime < THROTTLE_MS) {
            return; //throttles
          }
          this.lastUpdateTime = now;

          //calculate delta in degrees
          const deltaLng = lng - currentLocation.x * TILE_DEGREES;
          const deltaLat = lat - currentLocation.y * TILE_DEGREES;

          //convert to grid units (TILE_DEGREES = 1e-4 -> ~10 meters per tile)
          const dx = deltaLng / TILE_DEGREES;
          const dy = deltaLat / TILE_DEGREES;

          //Ignore tiny movements (or noise)
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
            return;
          }

          this.emit(dx, dy);
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
  }
}

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
        statusPanelDiv.innerHTML = "Your held token value: " +
          inventory.toString();
        //add to worldState if pickedup
        worldState.set(getCellKey(cell.xCoord, cell.yCoord), cell.value);
        saveState();
      } else if (cell.value == inventory) {
        cell.value = cell.value + inventory;
        inventory = 0;
        statusPanelDiv.innerHTML = "No held Token...";
        //add to worldstate if crafted
        worldState.set(getCellKey(cell.xCoord, cell.yCoord), cell.value);
        saveState();
      } else if (cell.value == 0) {
        cell.value = inventory;
        inventory = 0;
        statusPanelDiv.innerHTML = "No held Token...";
        //add to world state if placed in an empty cell
        worldState.set(getCellKey(cell.xCoord, cell.yCoord), cell.value);
        saveState();
      }

      //edit the html to display the new correct token value
      const element = marker.getElement();
      if (element) {
        element.innerHTML = cell.value.toString();
      }
    }
    //add my win condition here
    if (inventory >= 32) {
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
  saveState();
}

function saveState() {
  const state: GameState = {
    playerPosition: { x: currentLocation.x, y: currentLocation.y },
    inventory,
    movementMode: movementController instanceof GeolocationMovementController
      ? "geolocation"
      : "button",
    worldState: Array.from(worldState.entries()),
  };
  localStorage.setItem("gameState", JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem("gameState");
  if (!saved) return null;
  return JSON.parse(saved);
}

function setMovementController(controller: MovementController) {
  //unsubscribe from old
  if (movementController) {
    movementController.unsubscribe(playerMovement);
  }

  //stop GPS if needed
  if (movementController instanceof GeolocationMovementController) {
    (movementController as GeolocationMovementController).stop();
  }

  //subscribe new
  controller.subscribe(playerMovement);
  movementController = controller;

  //start GPS is needed
  if (controller instanceof GeolocationMovementController) {
    (controller as GeolocationMovementController).start();
  }

  //reflect mode in UI
  toggleButton.textContent = controller instanceof GeolocationMovementController
    ? "Switch to Buttons"
    : "Switch to GPS";

  //update URl Query param
  const url = new URL(globalThis.location.href);
  const mode = controller instanceof GeolocationMovementController
    ? "geolocation"
    : "button";
  url.searchParams.set("movement", mode);
  globalThis.history.replaceState({}, "", url);
  saveState();
}

//movement controller button event handler
toggleButton.addEventListener("click", () => {
  if (movementController instanceof GeolocationMovementController) {
    //switch buttons
    const buttonController = new ButtonMovementController();
    buttonController.init();
    setMovementController(buttonController);
  } else {
    //switch to gps
    if ("geolocation" in navigator) {
      const geoController = new GeolocationMovementController();
      setMovementController(geoController);
    } else {
      alert("Geolocation not supported");
    }
  }
});

//new game button event handler
newGameButton.addEventListener("click", () => {
  if (confirm("Start a new game? This will erase your progress.")) {
    //clear localStorage
    localStorage.removeItem("gameState");

    //reset in-memory state
    inventory = 0;
    worldState.clear();

    //reset to starting position
    currentLocation.x = Math.floor(CLASSROOM_LATLNG.lng / TILE_DEGREES);
    currentLocation.y = Math.floor(CLASSROOM_LATLNG.lat / TILE_DEGREES);

    //update player marker and map view
    const newLat = currentLocation.y * TILE_DEGREES;
    const newLng = currentLocation.x * TILE_DEGREES;
    playerMarker.setLatLng([newLat, newLng]);
    map.setView([newLat, newLng]);

    //reset status display
    statusPanelDiv.innerHTML = "No held Token....";

    //redraw the grid to show fresh cells
    updateVisibleCells();
  }
});

if (savedState) {
  //restore game state
  currentLocation.x = savedState.playerPosition.x;
  currentLocation.y = savedState.playerPosition.y;
  inventory = savedState.inventory;

  //restore world state
  worldState.clear();
  for (const [key, value] of savedState.worldState) {
    worldState.set(key, value);
  }

  //update UI to match inventory
  if (inventory > 0) {
    statusPanelDiv.innerHTML = "Your held Token value: " + inventory.toString();
  } else {
    statusPanelDiv.innerHTML = "No held Token...";
  }
} else {
  currentLocation.x = Math.floor(CLASSROOM_LATLNG.lng / TILE_DEGREES);
  currentLocation.y = Math.floor(CLASSROOM_LATLNG.lat / TILE_DEGREES);
}

playerMarker.setLatLng([
  currentLocation.y * TILE_DEGREES,
  currentLocation.x * TILE_DEGREES,
]);
map.setView([
  currentLocation.y * TILE_DEGREES,
  currentLocation.x * TILE_DEGREES,
]);

//at runtime parse the URL and choose which controller to use
if (movementMode === "geolocation") {
  const geoController = new GeolocationMovementController();
  setMovementController(geoController);
} else {
  const buttonMove = new ButtonMovementController();
  setMovementController(buttonMove);
  buttonMove.init();
}

//now we just call the redraw grid function to start up
updateVisibleCells();
