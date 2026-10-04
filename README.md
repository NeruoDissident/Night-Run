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

## Map and audio controls
- Zoom with the on-map **− / +** buttons, the mouse wheel over the map, or **− / +** keys. **0** or the percentage button resets to 100%. Zoom (50–200%) is saved between sessions.
- Settings has separate effects, ambience, and music volume controls. Music is optional and off by default; ambience uses quieter environmental textures without random pitched chimes. Audio stops on the title/end screens and while the tab is hidden.

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
node regression-test.js         # seeded NPC generation and combat/save regressions
node audio-test.js              # audio scheduling, mute, and lifecycle regressions
```

## Campaign foundation update
- Last Light beds and the quest panel open your refuge while inside the bar: store and retrieve whole item stacks, rest, and build a permanent-for-this-run workbench (8 scrap + 2 electronics).
- New runs start with A Foothold, pointing to Mags and Wren. First visits to other districts grant 35 XP. Level 4 now needs 360 cumulative XP rather than 840; later thresholds are unchanged.
- Saves have a version and previous-autosave recovery. Settings can export a JSON backup; the title screen can import it. Death and endings clear both local autosaves.
- Generation repairs clutter-blocked loot paths and relocates isolated loot within the same building/locked room where possible.
- Run `node foundation-test.js` for campaign, save, refuge and 500-city geometry checks.

See CAMPAIGN_PLAN.md for remaining work and test limitations.
