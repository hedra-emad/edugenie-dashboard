# Thumbnail Cropper: Maintenance Guide

## Core Invariant (The Single Law)

**At all times while cropper is open:**
> The image (possibly rotated, panned, zoomed) must fully cover the crop box.  
> No edge of the crop box may show empty arena background.

---

## When Adding New Mutation Sites

If you add a new method that changes any of these:
- `cropScale`
- `cropTranslateX` / `cropTranslateY`
- `cropBoxWidth` / `cropBoxHeight` / `cropBoxX` / `cropBoxY`
- `cropRotation`

**You must end with**: 
```typescript
this.enforceInvariant();
```

**Then**: 
```typescript
this.refreshThumbnailPreview();
```

Example:
```typescript
myNewCropperFeature() {
  this.cropScale *= 1.2;  // Mutation
  this.enforceInvariant();  // ← REQUIRED
  this.refreshThumbnailPreview();
}
```

---

## The Helpers (Use These, Don't Bypass Them)

### `getEffectiveDims()`
Use when you need image dimensions that respect rotation.

✅ **Good**:
```typescript
const dims = this.getEffectiveDims();
console.log(dims.w, dims.h);
```

❌ **Bad**:
```typescript
console.log(this._naturalW, this._naturalH);  // Ignores rotation!
```

### `computeCoverScale(boxW, boxH)`
Use when you need to know "what scale is required to cover this box?"

✅ **Good**:
```typescript
const minScale = this.computeCoverScale(this.cropBoxWidth, this.cropBoxHeight);
if (this.cropScale < minScale) {
  this.cropScale = minScale;
}
```

❌ **Bad**:
```typescript
const coverWidth = this.cropBoxWidth / this._naturalW;  // Ignores rotation!
```

### `clampTranslate()`
Use when pan/translate changes to keep image in bounds.

✅ **Good**:
```typescript
this.cropTranslateX = newX;
this.cropTranslateY = newY;
this.clampTranslate();  // Enforce bounds
```

❌ **Bad**:
```typescript
this.cropTranslateX = newX;
this.cropTranslateY = newY;
// No clamp → image can pan off screen!
```

### `enforceInvariant()`
Use at the END of any method that mutates state.

✅ **Good**:
```typescript
doSomething() {
  this.cropScale = ...;
  this.enforceInvariant();  // ← Always
  this.refreshThumbnailPreview();
}
```

❌ **Bad**:
```typescript
doSomething() {
  this.cropScale = ...;
  // No enforceInvariant() → gray may show!
}
```

---

## Rotation Gotchas

At 90°/270°, the image's bounding box flips. The crop cover scale changes.

**Both** methods use `getEffectiveDims()` to handle this:
1. `computeCoverScale()` — calculates min zoom needed
2. `clampTranslate()` — calculates pan bounds

❌ **Common mistake**: Forgetting to call `enforceInvariant()` in rotate methods.

✅ **Correct**:
```typescript
rotateRight() { 
  this.cropRotation += 90;
  this.enforceInvariant();  // ← Re-checks scale & bounds
  this.refreshThumbnailPreview(); 
}
```

---

## Preview vs. Export Rendering

Both use **the same transform logic** via `applyCanvasTransform()`:

- **Live preview**: `refreshThumbnailPreview()` → draws to `cropBoxWidth × cropBoxHeight` canvas
- **Export**: `confirmThumbnailCrop()` → draws to `1280 × 720` canvas with scaled transforms

If you modify transform logic:
- Change `applyCanvasTransform()` (shared) or the calls to it
- **NOT** `drawToCanvas()` alone or export logic alone
- Keep them in sync!

---

## Modal Layout Stability

The 380×380 arena is **fixed-size**. Image aspect ratio doesn't matter.

Key CSS:
```css
.cropper-arena {
  width: 380px;
  height: 380px;
  min-width: 380px;    /* ← Prevents shrink */
  min-height: 380px;   /* ← Prevents shrink */
  flex-shrink: 0;      /* ← Explicit no-shrink */
  overflow: hidden;    /* ← Content contained */
}
```

If layout breaks with different image sizes:
1. Check CSS for anything sizing off image (e.g., `width: auto`)
2. Verify arena has `min-width/height` and `flex-shrink: 0`
3. Check parent flex/grid isn't forcing arena to be content-sized

---

## Testing a Change

After any cropper change:

1. **Load image** → box fully covered? ✓
2. **Click Reset** → still covered? ✓
3. **Zoom in/out** → covered, can't go below minimum? ✓
4. **Pan** → can't drag image off screen? ✓
5. **Resize box** → auto-zooms to cover? ✓
6. **Rotate** → covered at 90°/180°/270°/0°? ✓
7. **Apply Crop** → export matches preview? ✓

If any fails → invariant violation → call `enforceInvariant()` from missing site.

---

## Emergency Debug

If gray shows in crop box or image pans off:

1. Add logging in `enforceInvariant()`:
```typescript
private enforceInvariant() {
  const minScale = this.computeCoverScale(this.cropBoxWidth, this.cropBoxHeight);
  console.log('Enforcing: scale', this.cropScale, '>=', minScale);
  if (this.cropScale < minScale) {
    this.cropScale = minScale;
  }
  this.clampTranslate();
  console.log('After clamp: tx', this.cropTranslateX, 'ty', this.cropTranslateY);
}
```

2. Find which method **isn't calling** `enforceInvariant()`:
   - Check mutations: zoom, pan, rotate, resize
   - Each should end with `enforceInvariant()`

3. Add the missing call:
```typescript
methodName() {
  // ... mutation ...
  this.enforceInvariant();  // ← Add this
  this.refreshThumbnailPreview();
}
```

---

## Future-Proofing

If you add:
- New zoom source (e.g., voice control) → call `enforceInvariant()`
- New pan source (e.g., arrow keys) → call `clampTranslate()`
- New rotation source (e.g., EXIF) → call `enforceInvariant()`
- New crop box mode → verify it calls `enforceInvariant()` after sizing

The pattern is consistent: **mutation + enforceInvariant + refresh**.

---

## Performance Notes

- `enforceInvariant()` is cheap (basic math)
- `computeCoverScale()` uses `getEffectiveDims()` (trivial)
- `clampTranslate()` does simple clamping (O(1))
- `refreshThumbnailPreview()` is called by UI event handlers, acceptable latency

No optimization needed unless profiling shows otherwise.

---

## Code Review Checklist

When reviewing changes to the cropper:

- [ ] Every mutation method ends with `enforceInvariant()` + `refreshThumbnailPreview()`
- [ ] No direct reads of `this._naturalW` / `this._naturalH` (use `getEffectiveDims()`)
- [ ] No manual `const minScale = ...` calculations (use `computeCoverScale()`)
- [ ] No manual translate bounds logic (use `clampTranslate()`)
- [ ] Canvas transforms use shared `applyCanvasTransform()` logic
- [ ] Arena CSS has `min-width`, `min-height`, `flex-shrink: 0`
- [ ] No dead code left behind

---

## Resources

- `THUMBNAIL_CROPPER_FIX.md` — Design decision & fix summary
- `CROPPER_TEST_VERIFICATION.md` — 14 test cases mapped to code
- `CROPPER_CODE_AUDIT.md` — Change summary & audit

All in: `edugenie-dashboard/` root
