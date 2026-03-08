

## ROOT CAUSE ANALYSIS

Through network request inspection and code audit, I identified why the continuous panoramic carousel generation is failing:

### Issue 1: Marketplace Style Overriding Panoramic Instructions
In `supabase/functions/generate-carousel-image/index.ts`, when a marketplace style is active (like "Clássico"), the edge function constructs the prompt as:
```typescript
textPrompt = `${stylePrompt}

${imagePrompt}`;
```

The `stylePrompt` includes portrait-specific instructions like "1080x1350 portrait format". Even though the `formatInstruction` (panoramic) is appended later, the LLM prioritizes the MORE SPECIFIC portrait dimensions mentioned early in the style prompt, effectively ignoring the panoramic override.

### Issue 2: Frontend Prompt Wrapping
In the `buildImagePrompt()` function, when marketplace styles are active, the panoramic prompt gets wrapped as:
```typescript
parts.push(`CONTENT FOR THIS CARD: ${basePrompt}`);
```

This makes the entire panoramic instruction appear as just "content" rather than the main generation directive, causing the style system to dominate over the panoramic requirements.

### Issue 3: Weak Fallback Instructions
The edge function's retry attempts (2-4) use simplified prompts that only mention the `formatInstruction` as a short sentence, not the explicit panoramic dimensions. This allows the LLM to fall back to portrait mode.

### Issue 4: Card Limit Validation Missing
Per user preference, when >3 cards exist and continuous mode is selected, the system should block with an error message rather than silently reducing the count.

## COMPREHENSIVE FIX PLAN

### 1. Edge Function Panoramic Enforcement
- **Priority Override**: When `panoramic: true` is detected, completely override any aspect ratio instructions from marketplace styles
- **Explicit Dimensions**: Force the exact pixel dimensions (3240x1350 for 3 cards) as the primary instruction
- **Model Selection**: Ensure panoramic requests always use the premium model for better instruction following

### 2. Frontend Prompt Restructuring  
- **Panoramic Detection**: Modify `buildImagePrompt()` to detect panoramic requests and avoid injecting conflicting aspect ratios
- **Style Sanitization**: Strip width/height directives from marketplace style prompts when panoramic mode is active
- **Instruction Hierarchy**: Place panoramic dimensions as the PRIMARY instruction, not as supplementary content

### 3. Validation and UX Improvements
- **Card Limit Check**: Add validation in the "Regenerar Tudo > Contínuo" flow to block attempts with >3 cards
- **Clear Error Messages**: Show specific guidance about the 3-card limit for continuous panoramic mode
- **State Consistency**: Ensure continuous mode flag synchronization across React state updates

### 4. Fail-Safe Mechanisms
- **Aspect Ratio Validation**: Strengthen the client-side image aspect ratio checking to reject narrow images
- **Retry Logic**: Improve fallback attempts to maintain panoramic constraints throughout all retry attempts
- **Debug Logging**: Add detailed console logs for panoramic generation attempts

## TECHNICAL IMPLEMENTATION

The fix involves:

1. **Edge Function Updates** (`supabase/functions/generate-carousel-image/index.ts`):
   - Add panoramic override logic before prompt construction
   - Strip conflicting aspect ratio instructions from marketplace styles
   - Ensure all retry attempts maintain panoramic constraints

2. **Frontend Updates** (`src/components/Carousel/CarouselGenerator.tsx`):
   - Enhance `buildImagePrompt()` with panoramic awareness
   - Add validation for continuous mode card limits
   - Improve error messaging for blocked operations

3. **Validation Logic**:
   - Block continuous mode selection when >3 cards exist
   - Show clear error messages with guidance
   - Prevent execution rather than silent fallbacks

This comprehensive approach addresses the prompt hierarchy conflicts, ensures consistent panoramic generation, and provides better user guidance for continuous carousel creation.

