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
const VIEW_DISTANCE = 50;
const PERCENT_CHANCE = 0.30;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
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

//Singular Variables
let inventory = 0;
const currentLocation = { x: 0, y: 0 };
const onScreenCells: Cell[] = [];

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

function redrawGrid() {
  //remove all the existing cells
  for (const cell of onScreenCells) {
    cell.rectangle.removeFrom(map);
    cell.marker.removeFrom(map);
  }

  onScreenCells.length = 0; //this will clear my array

  //now repopulate around the players current position
  const half = Math.floor(VIEW_DISTANCE / 2);
  for (
    let x = -half;
    x < half;
    x++
  ) {
    for (
      let y = -half;
      y < half;
      y++
    ) {
      const gridX = currentLocation.x + x;
      const gridY = currentLocation.y + y;
      spawnCell(gridX, gridY);
    }
  }
}

//Player movement function, takes in the x and y value on the grid and moves the player that many spaces
function playerMovement(dx: number, dy: number) {
  //update the logical position
  currentLocation.x = currentLocation.x + dx;
  currentLocation.y = currentLocation.y + dy;

  //convert the grid coords to actual lat/lng
  const newLat = CLASSROOM_LATLNG.lat + currentLocation.y * TILE_DEGREES;
  const newLng = CLASSROOM_LATLNG.lng + currentLocation.x * TILE_DEGREES;

  //move the player marer to the new position
  playerMarker.setLatLng([newLat, newLng]);

  //will always center around the player
  map.setView([newLat, newLng]);

  //redraw the grid upon movement
  redrawGrid();
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
  console.log(currentLocation);
});

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
redrawGrid();
