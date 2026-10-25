# Pond water

Height source generated with the built-in GPT Image tool on 2026-10-24. The exact generation prompt is in `prompt.txt`. Source image: `exec-b42b1d22-f9ec-4971-a078-1ee6aeb6103f.png` in the session's generated images.

The height field was resized to 1024 px, gently smoothed and blended across opposite margins to make a repeating surface. The normal map uses wrapped central differences; roughness varies gently with the same height field. The neutral color map is blurred macro variation, without painted highlights or reflections. These maps carry no photographic shoreline, objects or baked lighting.

- `pond-normal.webp`: 1024 px, desktop.
- `pond-normal-mobile.webp`: 512 px, mobile.
- `pond-roughness.webp`: 512 px, linear data.
- `pond-color.webp`: 512 px, neutral sRGB modulation of the material's green color.

The application loads one normal-map size per session and shares the maps between water materials. Reflection and lighting are evaluated by the renderer.
