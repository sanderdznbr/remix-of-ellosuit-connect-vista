
# Plan: Clean Onboarding, Fix KPIs, Public Booking, and Mobile UX

## Summary
This plan addresses 4 key areas: (1) redesigning the onboarding wizard with a clean blue theme, (2) removing fictitious KPI data, (3) fixing the public booking link error, and (4) improving mobile UX.

---

## 1. Redesign Onboarding Wizard (Clean Blue Theme)

**Current Issue:** The wizard has a light gradient background with cards - looks cluttered.

**Solution:** Complete redesign with:
- Full-screen blue gradient background (`bg-gradient-to-br from-blue-600 to-blue-800`)
- White text on blue background
- Simplified step indicators (dots instead of progress bars)
- Larger, cleaner selection cards with white backgrounds
- Smooth animations between steps
- Modern, minimalist aesthetic

**File:** `src/components/Onboarding/AIOnboardingWizard.tsx`

**Key Visual Changes:**
- Full blue background throughout
- White cards floating on blue
- Simple dot navigation
- Large touch-friendly buttons
- Icon-centric design for segments
- "Skip" option more subtle

---

## 2. Remove Fictitious KPI Data

**Current Issue:** Charts show fake demo data, making the dashboard look buggy.

**Affected Files:**
1. `src/components/Dashboard/AIAssistantHome.tsx` - Lines 32-57 have hardcoded demo arrays
2. `src/components/BotIA/BotIADashboard.tsx` - Lines 44-71 have demo analytics data
3. `src/components/Mobile/MobileHome.tsx` - Line 52 has hardcoded "Emails: 12"

**Solution:**
- Remove static chart sections until real data exists
- Show KPI cards with real database counts only
- Add empty states when no data: "Comece a usar para ver estatisticas"
- Remove charts entirely OR show placeholder "Em breve" state
- MobileHome: fetch real email count from database

---

## 3. Fix Public Booking Link Error

**Current Issue:** `ImprovedBookingCalendar.tsx` queries wrong table (`booking_links` instead of `public_booking_links`).

**Root Cause Analysis:**
- Route `/:companyName/:slug` uses `ImprovedBookingCalendar.tsx`
- This file queries `booking_links` table (line 61)
- Should query `public_booking_links` table
- Also queries `user_availability` but should fallback to `availability_schedules`
- Insert goes to `scheduled_bookings` but should go to `public_bookings`

**File:** `src/pages/ImprovedBookingCalendar.tsx`

**Changes:**
1. Line 61: Change `booking_links` to `public_booking_links`
2. Lines 79-84: Add fallback from `availability_schedules` (like ImprovedBookingPublic does)
3. Line 148: Change `scheduled_bookings` to `public_bookings`

---

## 4. Improve Mobile UX

**Current Issues:**
- MobileHome shows hardcoded data
- Navigation could be more intuitive
- Cards could use better styling

**Solution:**
- Update `MobileHome.tsx` to use the more modern `MobileHomeScreen.tsx` design
- Fetch real email counts from database
- Add proper loading states
- Improve card styling with blue accents
- Better spacing and touch targets
- Add pull-to-refresh gestures
- Consistent rounded corners (rounded-2xl)

**Files to Update:**
- `src/components/Mobile/MobileHome.tsx` - Major improvements
- `src/components/Mobile/MobileStatsCard.tsx` - Better styling

---

## Technical Implementation Details

### A. AIOnboardingWizard.tsx - Full Rewrite
```text
Structure:
- Full-screen blue gradient container
- Centered white content card (max-w-xl)
- Step dots at top
- Clean typography (white on blue header)
- Large segment cards in 2x4 grid
- Simple "Continuar" button
- Subtle "Pular" link
```

### B. AIAssistantHome.tsx - Remove Demo Charts
```text
Remove:
- weeklyActivityData array
- distributionData array  
- performanceData array
- Weekly Activity Chart section
- Distribution Chart section
- Performance Chart section

Keep:
- KPI cards (they use real data)
- Quick Access buttons
- Quick Actions cards
```

### C. BotIADashboard.tsx - Remove Demo Analytics
```text
Remove:
- conversationsData array
- satisfactionData array
- responseTimeData array
- Charts in Analytics tab

Replace with:
- "Em breve" placeholder in Analytics tab
- Or simple stats from real agent data
```

### D. ImprovedBookingCalendar.tsx - Fix Queries
```text
Line 61: 'booking_links' -> 'public_booking_links'
Line 79: Add fallback to 'availability_schedules'  
Line 148: 'scheduled_bookings' -> 'public_bookings'
```

### E. MobileHome.tsx - Improvements
```text
- Fetch real email count
- Use blue color scheme (match design system)
- Better card shadows
- Proper loading states
- Remove hardcoded "12"
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Onboarding/AIOnboardingWizard.tsx` | Full redesign with blue theme |
| `src/components/Dashboard/AIAssistantHome.tsx` | Remove demo charts |
| `src/components/BotIA/BotIADashboard.tsx` | Remove demo analytics |
| `src/pages/ImprovedBookingCalendar.tsx` | Fix table names |
| `src/components/Mobile/MobileHome.tsx` | Fetch real data, improve styling |
| `src/components/Mobile/MobileStatsCard.tsx` | Blue color scheme |

---

## Expected Results

1. **Onboarding**: Clean, professional blue-themed wizard that's easy to use
2. **Dashboard KPIs**: Only real data shown, no fake charts
3. **Public Booking**: Links will work correctly
4. **Mobile UX**: Modern, consistent, real data everywhere
