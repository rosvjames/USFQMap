# David — Scan the World

Model: [David (Michelangelo).stl](https://commons.wikimedia.org/wiki/File:David_(Michelangelo).stl), by **Scan the World @ Myminifactory.com** ([original artwork/model page](https://www.myminifactory.com/object/3d-print-michelangelo-s-david-in-florence-italy-2052)). The source is a complete photogrammetric/structured-light scan, not the approximate procedural figure previously used by MiCampus.

The source and these adapted GLB models are licensed under **[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)**. Attribution does not imply endorsement. This notice concerns the model assets; the application's other files retain their existing terms.

Adaptations: conversion from STL to GLB, Z-up to Y-up rotation, centering, scaling to 4.4 metres, mesh simplification, recalculated smooth normals, and an ivory marble material. Original: 1,199,948 triangles; desktop: 99,992 triangles (2.40 MB); mobile: 40,000 triangles (0.96 MB). See `attribution.json` and the GLB's embedded asset metadata for provenance, source checksum and mesh dimensions.

Rebuild from the project root with `node scripts/prepare-david.mjs`. The script downloads the original if absent, verifies its known SHA-1, and uses the project's existing Three.js and meshoptimizer packages. The 60 MB original stays in ignored `output/david-real/`, not in the web bundle.
