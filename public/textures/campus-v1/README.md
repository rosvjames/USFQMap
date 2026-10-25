# Campus materials v1

Albedos generated individually with GPT Image on 2026-10-24 for MiCampus. Tree leaf alpha reuses the earlier Miguel foliage generation. Prompts are recorded in `prompts.json`; runtime asset paths, resolutions and physical tile sizes are in `manifest.json`.

Sixteen surface families include 512–1024 px WebP albedos, 512 px OpenGL tangent normals (+Y), and linear roughness maps. Important 1024 px albedos include 512 px mobile variants. Neutral albedos retain the existing building palette through material tint. Grass, sand, soil, synthetic turf and bark retain natural generated colors. Normals and roughness are conservative artistic approximations derived from generated scans, not measured PBR captures. No displacement or building silhouette changes are implied.

Borders are blended periodically to reduce tiling seams. Palm frond and tree foliage have real alpha; the palm is rotated from its generated vertical orientation so the runtime rachis runs from left attachment (u=0) to right tip (u=1). Keep foliage on double-sided alpha-tested geometry, with alpha-tested depth materials for shadows.

Preparation, source provenance, validation and Claude Sonnet 5.5 High implementation logs are retained locally in `output/claude-campus-textures/`. Do not delete original generated source images when optimizing these assets.
