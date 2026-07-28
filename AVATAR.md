# Avatar pipeline

## Why the original avatar did not move
`public/avatar.glb` was the Lee Perry Smith **head-scan**: a static mesh with **no skeleton**.
`AvatarCanvas.findBone()` only matches `child.isBone`, and three.js's GLTFLoader only creates
`Bone` objects for joints that belong to a **skin**. No skin → no bones → every pose is a no-op.
It was also head-only, so there was no upper body to show.

## What a working model needs
1. A **skeleton/skin** (so joints load as `isBone`).
2. Joint names that contain the keywords below (after lower-case + strip non-alnum).
3. Reasonably human proportions; the camera auto-frames the upper body regardless of height.

### Keyword table (mirrors `findBone` calls in AvatarCanvas.jsx)
| Drives | Accepts any name containing… |
|---|---|
| RightArm | rightarm · armr · upperarmr · shoulderr · mixamorigrightarm |
| RightForeArm | rightforearm · forearmr · lowerarmr · elbowr · mixamorigrightforearm |
| LeftArm | leftarm · arml · upperarml · shoulderl · mixamorigleftarm |
| LeftForeArm | leftforearm · forearml · lowerarml · elbowl · mixamorigleftforearm |
| R index 1/2 | righthandindex1/2 · index1r/2r · handindex1r/2r |
| R middle 1/2 | righthandmiddle1/2 · middle1r/2r · handmiddle1r/2r |
| R ring 1/2 | righthandring1/2 · ring1r/2r · handring1r/2r |
| R pinky 1/2 | righthandpinky1/2 · pinky1r/2r · handpinky1r/2r |
| R thumb | righthandthumb1 · thumb1r · handthumb1r |

Mixamo rigs (`mixamorig:RightArm`…) and plain rigs (`RightArm`…) both match.

## Route A — generate offline (mannequin)
`node frontend/tools/make-avatar.mjs` writes `frontend/public/avatar.glb`.
It builds a `SkinnedMesh` with rigid skinning and the exact bone names above, plus face
features and skin-tone vertex colors. Verify at https://gltf-viewer.donmccurdy.com/.

## Route B — realistic rigged human
Ready Player Me (GLB, enable hand bones) or Mixamo (convert FBX→GLB in Blender). Drop the
file in as `public/avatar.glb`. Validate names against the table (gltf-viewer lists nodes).

## Framing & mirroring (visual-only knobs in AvatarCanvas.jsx)
- Upper-body crop: `focusY = box.min.y + size.y * 0.68` and `camera.position.z = 1.9`.
- If signs look mirror-flipped on screen, negate the camera X or Z (one number) — do **not**
  touch the pose dictionaries (that is core logic).

## Adding a sign (the intended extension point)
Add an entry to `RPM_POSES` in `AvatarCanvas.jsx`:
```js
WORD: {
  arm: { RightArm:[x,y,z], RightForeArm:[x,y,z], LeftArm:[x,y,z], LeftForeArm:[x,y,z] },
  hand: FINGER_SHAPES.OPEN_PALM, // or FIST / POINT / FLAT_O
}