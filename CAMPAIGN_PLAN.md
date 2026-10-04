# Night Run campaign development

The intended loop is prepare at the Last Light, follow a lead, survive an expedition, return with useful salvage, and advance an escape or a reason to stay.

## Current playable milestone
- Last Light stash, workbench and treatment-corner projects.
- Opening journal lead, exploration XP and earlier specialization.
- Separate boat hull, motor, fuel and provision deliveries; skilled, material-heavy and paid alternatives.
- Peaceful, combat and technical passage options, with corresponding ending text and a fallback if Kesh is unavailable.
- Versioned saves, autosave recovery and export/import; existing assembled boats retain progress.
- Escape journal/summary fixes, train mechanic access, friendly guard passage and restored Mags introduction.
- Sprite presentation and JavaScript retained; campaign projects now have their own campaign.js module.

## Validation and limits
### Deterministic functional checks
500 cities / 4,000 districts: expected NPCs and bosses spawn; essential escape fixtures exist; exits, escape controls, NPC approach tiles, stocked containers and quest floor items are geometrically accessible. The repair preserves loot totals and existing locked-door data/tiles. The prior eleven isolated ordinary containers are resolved in this sample. Locks are treated as passable; geometry is not a proof of combat survival or every locked-route strategy.

route-test.js exercises all three boat passage branches, helicopter, train and both Heart outcomes, costs, out-of-order deliveries, saving between projects, legacy boat migration, denied departures, completed quest summaries, treatment limits and friendly passage. These scenarios use scripted positioning and a frozen enemy phase. Supplies are collected from generated loot; skills/currency and Heart shards are fixtures where needed. They are functional route tests, not unassisted playthroughs.

Browser checks cover desktop and 390px mobile, boat menus, missing-material feedback, completing deliveries, reloading, final launch confirmation and the decoy ending. Previous refuge, save export/import, zoom and audio lifecycle checks also pass. Combat regressions and the random-action smoke test remain included.

### Normal-action exploratory expeditions
The latest 30 trials across six starting classes completed Wren's package 21 times; 24 characters died, six stopped with controller/planning limitations, and none escaped. Seven reached level 4. The controller uses real movement, combat, inventory limits and survival costs, but full-map knowledge and limited retreat, equipment, trading and resupply decisions. These results identify follow-up work; they are not human win rates or evidence of final balance. expedition-test.js reproduces this diagnostic (optional NR_REPORT path saves detailed JSON).

New generation rules do not rebuild already visited districts in older saves. Completion time and human balance remain unmeasured. The project is still a campaign prototype, not the full-length release.

## Next milestones
1. Complete successful normal-action campaigns with representative builds, deliberate retreats, equipment upgrades and refuge/resupply trips. Identify actual game balance problems separately from controller limitations.
2. Tune the first hour and boat resource economy; add clear useful local leads where players would otherwise search blindly.
3. Give Ashgrove and Marrow persistent authored sites, alternate approaches, and NPC needs that support the boat/refuge loop.
4. Expand tool-dependent salvage, repair and crafting, then changing faction relationships and refuge power projects.
5. Add more boat expedition content and distinct finales before extending the same depth to other escapes.
6. Expand district variation, builds and sprite animation once that connected campaign works.

A 4-8 hour successful campaign and 20-40 minute expeditions remain design targets to test, not measured completion times.
