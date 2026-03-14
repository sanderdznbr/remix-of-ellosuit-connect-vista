

## Problem Analysis

**Duplicates**: There's a race condition between the inline auto-save at the end of each generation flow and the debounced auto-save `useEffect`. Both check `currentCarouselIdRef.current === null` and both can trigger an INSERT simultaneously — the inline save's INSERT may still be in-flight when the 3s debounce fires, causing a second INSERT.

**Missing covers**: Some generation paths call `captureCoverImage` with a `setTimeout` of 2s, but the first card's image may not be ready. The auto-save path also tries to capture covers only on INSERT (not on UPDATE), so if the first attempt fails, the cover is never retried.

Additionally, `fetchRecent` is called 3 times on mount (lines 70-72) — harmless but wasteful.

## Plan

### 1. Fix duplicate saves — add a saving mutex

Add a `isSavingRef = useRef(false)` flag. Set it to `true` before any inline save (INSERT) in all generation paths, and `false` after. The auto-save `useEffect` will check this flag and skip if true.

In `CarouselGenerator.tsx`:
- Add `const isSavingRef = useRef(false);`
- In the auto-save `useEffect` (line 744), add guard: `if (isSavingRef.current) return;`
- In each generation path's inline save block (~5 locations), wrap with `isSavingRef.current = true` before and `isSavingRef.current = false` after

### 2. Fix missing covers — retry on update

In the auto-save `useEffect` (update path, line 762-770), after the update call, check if the carousel has no `cover_url` yet and retry `captureCoverImage`. This ensures covers are eventually captured even if the first attempt failed.

Add logic: after the `update` call, query the current cover_url. If null/empty, call `captureCoverImage`.

### 3. Clean up triple fetchRecent

Remove the duplicate `useEffect` calls at lines 71-72, keeping only the one at line 70 with proper dependency.

### Files to edit
- `src/components/Carousel/CarouselGenerator.tsx` — mutex flag + cover retry
- `src/components/Dashboard/DashboardHome.tsx` — remove duplicate fetchRecent calls

