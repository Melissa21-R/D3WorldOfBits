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
[ ] Be sure that cells continue to spawn when I player scrolls throughout the map
[ ] Add one cleanup commit: extract constants, rename variables, remove debug logs
