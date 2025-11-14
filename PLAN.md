# D3: Bit Hunter

## D3.a: Core Mechanics

[x] Use template and enable GitHub Actions
[x] Delete starter main.ts content
[x] Initialize Leaflet map centered on classroom
[x] Draw player location
[x] Draw a grid of cells (e.g., 5x5)
[x] Make cells show token value (text or emoji 🎯)
[x] Allow clicking only on nearby cells
[x] Implement token pickup (max 1 in hand)
[x] Implement crafting: click cell with same-value token to merge or place in empty cell
[x] Display win condition when high-value token crafted

## D3.b: Globe-spanning Gameplay

[x] Add player movement: implement `movePlayer(dx: number, dy: number)` function (in grid units)
[x] Render player avatar on map using Leaflet marker or custom DOM element
[x] Add UI buttons (N/S/E/W) that call movement function
[x] Update grid rendering: generate cells around _player's global position_, not fixed center
[x] Use earth-spanning coordinates: anchor grid on (0,0), calculate cell lat/lng from grid indices
[x] Ensure only nearby cells (e.g. 3x3 around player) are interactive (clickable)
[x] Test movement across map boundaries (e.g. cross equator, prime meridian)
[x] Verify gameplay works far from starting location (try jumping to NYC or Tokyo in code)
[x] Be sure that cells continue to spawn when I player scrolls throughout the map
[x] Add one cleanup commit: extract constants, rename variables, remove debug logs
[x] Create a new win threshold

## D3.c: Object Persistence

[x] Design `worldState: Map<string, number>` to store only modified cell token values
[x] Create `getCellKey(lat: number, lng: number): string` to hash grid-aligned coords (e.g., `"3699,-12206"`)
[x] For any cell:
[x] If `worldState.has(key)`: use stored value
[x] Else: compute initial state via `luck()` hashing — do **not** store until modified
[x] When player picks up a token:
[x] Set `worldState.set(key, 0)` (or delete entry if 0 means "default")
[x] Later: decide if storing `0` is cleaner than deletion (consistency vs. size)
[x] When crafting: update target cell in `worldState`
[x] Rebuild visible cells from scratch each time — do **not** keep DOM nodes alive
[x] Test: move away and back — does state persist?
[x] Test: craft a token, leave, return — is it still gone?
[x] Make sure untouched cells still use `luck()` — no premature storage
[x] Add one cleanup commit: remove unused variables, debug logs

## D3.d: Gameplay Across Real-world Space and Time

[x] Switch movement source to geolocation: use `navigator.geolocation.watchPosition()` to detect real-world movement\
[x] Calculate positional delta (lat/lng) between updates and convert to grid movement (dx, dy)\
[ ] Throttle movement updates to avoid excessive changes (~1000ms interval)\
[ ] Create `MovementController` interface with `subscribe` and `unsubscribe` methods\
[ ] Implement `ButtonMovementController` class that fires movement events from buttons\
[ ] Implement `GeolocationMovementController` class that fires movement events from GPS changes\
[ ] Apply Facade pattern: game logic depends only on `MovementController`, not concrete implementations\
[ ] Read URL query string (e.g. `?movement=geolocation`) to select movement mode at start\
[ ] Add on-screen toggle button to switch between geolocation and button controls\
[ ] Ensure toggle persists or resets cleanly (consider UX flow)\
[ ] Save game state (`playerPosition`, `movementMode`, etc.) to `localStorage` on change\
[ ] Load game state from `localStorage` on page load — resume where left off\
[ ] Add "New Game" button that clears `localStorage` and resets state\
[ ] Test geolocation mode using Chrome DevTools > Sensors (simulate movement)\
[ ] Test persistence: reload page, close tab, return — should restore state\
[ ] Deploy to GitHub Pages (required for HTTPS → geolocation works)\
[ ] Verify gameplay works across real-world locations (simulate NYC, Tokyo, etc.)
