# Campus animals

Base meshes by **Innerscene**, distributed under **CC0-1.0**:

- [Farm Pig](https://www.innerscene.com/tools/library/3d-parts/farm-pig-85281eb9)
- [Large Dog Standing](https://www.innerscene.com/tools/library/3d-parts/large-dog-standing-6d1b30be)
- [Library terms](https://www.innerscene.com/tools/library/terms), [CC0 dedication](https://creativecommons.org/publicdomain/zero/1.0/).

These are adapted animal meshes, not scans or exact likenesses of Gastón, Pancho or Pancha. The generic dog base has been reshaped toward greyhound proportions. Changes include coordinate normalization, proportions, pig ears, collars, vertex colors, simplification, recalculated normals and skeletal skinning. `manifest.json` records the source hashes and measured budgets. Each GLB also includes source and license metadata.

`pig-coat*.webp` and `dog-coat*.webp` are diffuse textures generated with GPT Image for this project. The complete prompts are in `prompts.json`. Maps are 512 × 512 on desktop and 256 × 256 on mobile. They use neutral lighting and softened opposite edges for repeating UVs.

| Variant | Triangles | GLB size | Joints |
| --- | ---: | ---: | ---: |
| Pig | 10,792 | 685 KB | 15 |
| Pig, mobile | 5,264 | 370 KB | 15 |
| Dog | 11,584 | 757 KB | 17 |
| Dog, mobile | 6,858 | 453 KB | 17 |

Run `node scripts/prepare-campus-animals.mjs` from the project root to rebuild GLBs. It downloads missing originals to ignored `output/animal-realism/`, verifies their SHA-256, then writes these variants. The existing WebP maps are retained. No asset service is contacted at runtime: the app serves models and textures locally. Pancho and Pancha share the dog mesh and coat but have independent skeletons and collar colors. Standard rough materials, no environment reflections, two draw calls for the pig and three per dog, no additional shadow pass.
