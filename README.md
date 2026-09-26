# Fractured City: Night Run

A procedural cyberpunk survival roguelike that runs in the browser. One person, one fractured city, and something in the wiring that already knows your name.

**Play:** open `index.html`, or deploy this repo as a static site (Vercel: framework preset "Other", no build command, output directory `.`).

## What's in it
- 7 classes (Street Kid, Soldier, Picker, Netjack, Medic, Bruiser, unlockable Listener), 14 specializations, ~60 talents
- 8 procedurally generated districts with their own palettes, factions, enemies and loot
- Tactical turn-based combat, stealth, cover, line of sight, fog of war, day/night
- Injuries, hunger, fatigue, carrying capacity, crafting, trading
- Chrome (cybernetics) and Flesh (grafts), 7 factions with reputation, 15 NPCs, 17 quests, random events
- The Echo, 4 escape routes and 9 endings, permadeath, save/continue, meta unlocks
- Pixel-art sprites, synthesized audio, keyboard / mouse / touch controls

## Layout
| File | Role |
|---|---|
| `data.js` | Content definitions: tiles, tilesets, items, classes, talents, factions, enemies, zones, prefabs, NPCs, recipes |
| `content.js` | Quests, dialogue trees, events, endings |
| `gen.js` | Procedural generation (streets, buildings, tunnels, mall, exits, population) |
| `engine.js`, `engine2.js` | Game rules: turns, FOV, items, progression, factions, combat, AI, abilities, endings, saves |
| `render.js` | Sprite renderer, lighting, effects |
| `audio.js` | WebAudio-synthesized ambience, music and SFX |
| `ui.js` | Screens, panels, modals, input |
| `assets/gen_sprites.py` | Generates `assets/atlas.png`, `atlas.json`, `title.jpg` (Python + Pillow) |
| `build.js` | Bundles everything (assets inlined) into the self-contained `index.html` |
| `test.js`, `bot.js` | Headless engine test; Playwright bot that plays through the real UI |

## Rebuild
```
python3 assets/gen_sprites.py   # only if you changed the art
node build.js                   # writes index.html
node test.js                    # engine smoke test
```
