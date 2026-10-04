# Night Run campaign development

The intended loop is prepare at the Last Light, follow a lead, survive an expedition, return with useful salvage, and advance an escape or a reason to stay.

## Delivered in this pass
Personal campaign stash, a buildable crafting workbench, opening journal lead, one-time exploration XP, earlier specialization, versioned saves with recovery and export/import, NPC door-movement repair, and improved quest-loot placement. Existing sprite presentation and JavaScript remain.

## Validation
- 500 cities / 4,000 districts: named NPC spawn checks; exits, quest-bearing containers and quest floor items checked geometrically, and major route item types present.
- Locks are treated as passable in geometry tests. This does not prove the player can satisfy every lock or finish every route.
- Save rollback, future-version rejection, legacy migration, backup recovery, stash ownership/weight/location constraints, project reward uniqueness and exploration reward uniqueness.
- Browser checks: new run, zoom/audio regression, refuge menus, stash transfers, project construction, crafting menu, reload, export/import, desktop and 390px mobile layout.
- Existing random-action smoke test and combat/audio regressions.

## Known limits
Eleven ordinary stocked containers remain geometrically isolated across the 500-city sample. Destructive traversal was not modeled. The repair does not regenerate already visited districts in old saves. Full fresh-start-to-ending route playthroughs remain outstanding. Timing and human win rates have not been established. The new opening XP curve is an initial tuning pass, not a final balance claim. The refuge currently has one construction project; the bench uses existing recipes and does not consume stash contents directly.

## Next milestones, in order
1. Complete route playthroughs and remaining generation repairs; validate essential interactions as well as loot.
2. Tune the first hour using representative builds, retreats, healing, quests, and noncombat approaches.
3. Expand the refuge with medical/power projects and changing contact needs.
4. Deepen Ashgrove and Marrow with persistent sites, alternate approaches and authored encounters.
5. Expand predictable salvage, repair and tool-dependent crafting.
6. Deepen existing NPC relationships and faction consequences.
7. Build the boat route into a substantial multi-stage campaign, then expand other endings.
8. Expand district variation, builds and sprite animation after that small campaign works.

A first substantial campaign should prove the refuge/expedition/return loop with one complete escape. A 4-8 hour successful campaign and 20-40 minute expeditions are design targets to test, not measured completion times.
