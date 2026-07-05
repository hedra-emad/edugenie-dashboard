# Thumbnail Cropper: Code Audit & Changes

## Files Modified

1. `course-basic-info.component.ts` - Core logic
2. `course-basic-info.component.html` - Layout improvements
3. `course-basic-info.component.css` - Arena fixed-size guarantee

---

## TypeScript Changes Summary

### New Helper Methods (Single Source of Truth)

#### 1. `getEffectiveDims()` — Rotation-Aware Dimensions
- **Purpose**: Account for 90°/270° rotation where width ↔ height swap
- **Used by**: `computeCoverScale()`, `clampTranslate()`
- **Lines**: ~462-467

#### 2. `computeCoverScale(boxW, boxH)` — Minimum Scale Calculator
- **Purpose**: Compute minimum zoom needed to cover a box
- **Policy**: Covers current crop box size (not fixed arena)
- **Used by**: `enforceInvariant()`, `onHandleMove()`
- **Lines**: ~476-481

#### 3. `clampTranslate()` — Pan Boundary Enforcement
- **Purpose**: Keep `cropTranslateX/Y` within valid bounds
- **Uses**: `getEffectiveDims()` for rotation-aware bounds
- **Called by**: Every mutation method via `enforceInvariant()`
- **Lines**: ~573-582

#### 4. `enforceInvariant()` — Central Invariant Enforcement
- **Purpose**: Single method to re-enforce: "image covers box"
- **Logic**: 
  1. Ensure `cropScale >= computeCoverScale(cropBoxWidth, cropBoxHeight)`
  2. Call `clampTranslate()` to keep image in bounds
- **Called by**: All 9 mutation sites
- **Lines**: ~559-566

#### 5. `applyCanvasTransform()` — Shared Canvas Transform Logic
- **Purpose**: Eliminate duplication between preview and export rendering
- **Used by**: `refreshThumbnailPreview()`, `drawToCanvas()` (and indirectly by `confirmThumbnailCrop()`)
- **Lines**: ~748-763

---

## All Mutation Sites Audited

| Method | Lines | Change |
|--------|-------|--------|
| `onCropImageLoaded()` | ~603-624 | Now uses current box for cover scale (not arena); calls `enforceInvariant()` |
| `resetCropTransform()` | ~628-643 | Now uses current box; calls `enforceInvariant()` |
| `onCropWheel()` | ~530-537 | Calls `enforceInvariant()` instead of manual minScale check |
| `zoomIn()` | ~539-543 | Calls `enforceInvariant()` |
| `zoomOut()` | ~545-549 | Calls `enforceInvariant()` (removed minScale calc) |
| `updateZoom()` | ~584-588 | Calls `enforceInvariant()` |
| `rotateLeft()` | ~590-594 | Calls `enforceInvariant()` (handles dimension swap) |
| `rotateRight()` | ~596-600 | Calls `enforceInvariant()` (handles dimension swap) |
| `onDocumentMove()` | ~508-526 | Pan already calls `clampTranslate()` (verified, unchanged) |
| `onHandleMove()` | ~725-738 | Added `enforceInvariant()` after box size change |

---

## No Duplicate Code

✅ Verified via grep:
- `getEffectiveDims()` defined once (~462)
- `computeCoverScale()` defined once (~476)
- `clampTranslate()` defined once (~573)
- `enforceInvariant()` defined once (~559)
- `applyCanvasTransform()` defined once (~748)

✅ No leftover dead code:
- Old `const minScale = ...` computations only in `enforceInvariant()` (~560) and `onHandleMove()` (~725) where they're legit
- No duplicate calculations left in methods

---

## HTML Changes

**Location**: Crop zone section (~line 138-190 in template)

1. Added `title` attributes to all buttons (zoom, rotate, reset)
2. Reorganized zoom control section for clarity
3. Fixed layout structure with explicit sections
4. Added comments for maintainability

**Result**: Better UX, same functionality

---

## CSS Changes

**Location**: `.cropper-arena` definition

**Before**:
```css
.cropper-arena {
  width: 380px;
  height: 380px;
  overflow: visible;
}
```

**After**:
```css
.cropper-arena {
  width: 380px;
  height: 380px;
  min-width: 380px;     /* ← Prevent flex shrink */
  min-height: 380px;    /* ← Prevent flex shrink */
  flex-shrink: 0;       /* ← Explicit no-shrink */
  overflow: hidden;     /* ← Changed from visible */
}
```

**Why**: Guarantees arena stays exactly 380×380 regardless of image aspect ratio or flex layout, preventing accidental content-based resizing.

---

## Policy Decision Documented

**Code Comment at `computeCoverScale()`**:
```
Policy: Always cover the CURRENT crop box (cropBoxWidth/cropBoxHeight),
not the fixed arena. This minimizes unnecessary zoom (and resulting blur)
and produces a tight, accurate framing match between preview and final crop.
```

This is the key design decision that fixes the blur symptom.

---

## Build Verification

✅ `npm run build` succeeded with 0 errors

Chunk name: `course-basic-info-component` (73.64 kB → 15.40 kB transferred)

---

## No Regressions Introduced

- All existing form/upload logic untouched
- All lifecycle hooks unchanged
- No new dependencies added
- Canvas API usage consistent with before
- No breaking changes to component interface

---

## Lines Added/Removed

**TypeScript**:
- Added: ~120 lines (helpers + enhanced mutation methods)
- Removed: ~50 lines (dead code, duplicate calcs)
- Net: +70 lines (but cleaner, more maintainable)

**HTML**:
- Added: ~10 lines (comments, titles, structure)
- Net: +10 lines

**CSS**:
- Added: ~8 lines (min-width/height, flex-shrink, comments)
- Net: +8 lines

**Total**: ~88 new lines of well-structured, audited code
