

## Root Cause

The `generateSinglePost()` function (line 1278) is a completely separate code path from `generateContent()`. When `contentMode === 'single-post'`, it bypasses ALL real estate blend logic (black background AI generation + Canvas compositing). The property photo is sent as a reference hoping the AI uses it, but the AI ignores it and generates its own house image.

## Solution: Add Real Estate Blend Pipeline to `generateSinglePost()`

### Changes to `src/components/Carousel/CarouselGenerator.tsx`

**Inside `generateSinglePost()` (~line 1278-1419), add:**

1. **Detect real estate mode** (same triple-source detection as `generateContent`)
2. **Convert property photos to base64** before AI call
3. **Modify prompt for black background** when real estate is detected:
   - Append the "FUNDO SÓLIDO PRETO" instruction
   - Remove property photos from `referenceImageUrls` (don't send to AI)
   - Keep property data in prompt text (price, area, rooms, etc.)
4. **After AI returns**, run Canvas blend:
   - Draw real property photo as full background (cover fit)
   - Add dark gradient for text readability
   - Overlay AI image using `screen` composite mode (bottom 45% + top 22%)
   - Draw logo at selected position
5. **Use blended result** as the final `imageUrl`

### Changes to Edge Function

No changes needed — the edge function already handles the prompt correctly. The issue is purely client-side: `generateSinglePost` never tells the AI to use a black background, and never blends the photo afterward.

### Key Code Structure

```text
generateSinglePost()
├── [EXISTING] Build prompt, collect refs
├── [NEW] Detect real estate (snapshot + ref + state)
├── [NEW] Convert property photos to base64
├── [NEW] If real estate: modify prompt → black BG instruction
├── [NEW] If real estate: set referenceImageUrls = undefined
├── [EXISTING] Call generateImage()
├── [NEW] If real estate: Canvas blend (photo + AI overlay)
├── [EXISTING] Save result
```

This is the definitive fix — the blend code already works correctly in `generateContent()`, it just needs to be replicated in `generateSinglePost()`.

