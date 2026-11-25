# Credits

## Aerial imagery

Map imagery comes from **LINZ Basemaps** (aerial layer),
© Toitū Te Whenua Land Information New Zealand, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Attribution to show in the game (LINZ's recommended wording), with links:

> © [LINZ CC BY 4.0](https://www.linz.govt.nz/linz-copyright) © [Imagery Basemap contributors](https://www.linz.govt.nz/data/linz-data/linz-basemaps/data-attribution)

LINZ's terms say the attribution must be **visible in the product** and must link to the LINZ copyright statement and the Basemaps attribution page. A credits screen or a corner label on the map both work. Painted and pixel-art versions are derived works under CC BY 4.0, so they need the same attribution, plus a note that the imagery was modified.

Suggested in-game line:

> Map based on LINZ aerial imagery, © Toitū Te Whenua LINZ, CC BY 4.0 (modified).

## Sprites

The trap line pictures in `assets/sprites/trap/` (trap box, lid, kill trap, eggs, rat, stoat, ferret, bags) are original to this project, drawn by code with `tools/trap_sprites.py`.

The planting pictures in `assets/sprites/plant/` (ground, penguin track, rabbit burrow and guard, seedlings, grown flax and shrubs, seedling tray, tools, wind streaks) are original to this project, drawn by code with `tools/planting_sprites.py`.

The rounds pictures in `assets/sprites/rounds/` (fence posts, wire, staples, hoof prints and other sign, tool cards, bait station, pellets, rat blocks, teeth marks, mouse, boot, flat mouse and dust puff, weta, slug, wasp nest, claw-marked trunk, chewed leaves, possum droppings, possum trap, lure, eyeshine, torch beam, possum and rabbit) are original to this project, drawn by code with `tools/rounds_sprites.py`.

The dusk count's view and creatures in `assets/sprites/count/` (headland, beach, slope, bush, foreground, clouds, hoiho, kororā, shag, tītī, gull, sea lion, fur seal, the rock, kelp) are original to this project, drawn by code with `tools/count_art.py`. The beach is an invented composition, not traced from any photo.

## Map tiles

All map tiles in `assets/tiles/terrain/` are original to this project, drawn by code: sea, rock shelf, grass, dirt, bush, flax, tussock, shrubs and rātā. `tools/terrain_tiles.py` makes them, using drawing routines in `tools/make_custom_tiles.py`. No third-party art is used on the map.

Kenney's RPG Base, Pirate Pack and Roguelike/RPG pack (CC0, kenney.nl) were downloaded on 2026-11-18 for the style test only. They are no longer used. If any Kenney art is used later (UI, for example), list it here and credit "Art by Kenney (kenney.nl)".

The map's terrain layer (where the sea, rock, bush and so on are) was first drafted from the LINZ aerial imagery and elevation, and the farm road was traced from the imagery, so the map's shapes are derived works and need the LINZ credit too.

## Elevation

Terrain shading and contours (`assets/maps/overlays/*-hillshade.png`, `*-contours.png`) are derived from **Southland LiDAR 1m DEM (2020-2024)**, © Toitū Te Whenua Land Information New Zealand, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The data is read from LINZ's public `nz-elevation` bucket by `tools/fetch_elevation.py`. The shading is a modified, derived work, so it needs the same in-game credit as the imagery, for example:

> Terrain based on LINZ LiDAR elevation data, © Toitū Te Whenua LINZ, CC BY 4.0 (modified).

## Imagery sources

`tools/fetch_aerial.py` rewrites the list below after each download. It checks each imagery layer's real footprint against the downloaded area, using LINZ's attribution data.

<!-- linz-sources:start -->
Area: 1000 m x 1000 m centred on -46.6549, 169.2073 (zoom 18), bbox W 169.20076 S -46.65939 E 169.21384 N -46.65041.
Retrieved 2026-11-12 from LINZ Basemaps (aerial).

Imagery layers covering this area, top (most visible) layer first:

- Otago 0.2m Rural Aerial Photos (2025) - CC BY 4.0 - Toitū Te Whenua Land Information New Zealand, Landpro, Otago Regional Council
- Southland 0.25m Rural Aerial Photos (2023-2024) - CC BY 4.0 - Landpro, Environment Southland, Toitū Te Whenua Land Information New Zealand
- Southland & Central Otago 0.4m Rural Aerial Photos (2013-2014) - CC BY 4.0 - Land Information New Zealand, Waitaki District Council, Unknown
- Southland 0.75m Rural Aerial Photos (2005-2011) - CC BY 4.0 - Land Information New Zealand, The Southland Consortium, Unknown
- New Zealand 10m Satellite Imagery (2025-2026) - CC BY 4.0 - Toitū Te Whenua Land Information New Zealand, European Space Agency, Planet
<!-- linz-sources:end -->

## UI art (title screen, notebook sketches, icons)
- The penguin silhouette, weather and calendar icons and the notebook sketches are drawn by code (`src/ui/draw.js`) with Phaser Graphics. Original work, no third-party art.

## Nest check art
- The nest scrape, hoiho (from above and from the front), eggs, chicks, weigh scale and bag, rehab crate, trail camera, stoat, rat and the night-camera greys are drawn by code (`tools/nest_sprites.py`, Pillow) into `assets/sprites/nest/`. Original work, no third-party art.

The stock game pictures in `assets/sprites/stock/` (cows, sheep, mud, tussocks, rope, fence, gate, cow pats, thistle, rushes, trough, the caretaker in oilskin and gumboots) are original to this project, drawn by code with `tools/stock_sprites.py`.

Every hoiho in the game (title, report, nests, dusk count) is drawn by one shared module, `tools/hoiho_art.py` (Pillow), which also writes the title and report art into `assets/sprites/hoiho/`. Original work, no third-party art. The cow's soft mud is drawn at run time by `src/scenes/StockScene.js`.
