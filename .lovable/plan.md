
## Trip Planner Feature Plan

### 1. Database Migration
- Create `trips` table: destination, dates, weather_summary, activities, suggested_looks (JSONB), packing_list (JSONB), user_id
- RLS policies for user-owned data

### 2. Edge Function: `trip-planner`
- Uses **Open-Meteo API** (free, no API key needed) for weather forecasts
- Uses Lovable AI to generate outfit suggestions based on:
  - Weather data
  - Selected activities
  - User's closet items (fetched from DB)
  - User's inspiration board
- Returns weather summary + per-activity outfit suggestions with wardrobe matches

### 3. Frontend Pages
- `/trips` — list of saved trips
- `/trips/new` — conversational multi-step flow:
  1. **Destination** — text input for city name
  2. **Dates** — date range picker
  3. **Weather** — auto-fetched, displayed as summary card
  4. **Activities** — multi-select chips (Pool Day, Beach, Casual Sightseeing, Dinner Out, Date Night, Club, Hiking, Business, Long Flights, Other)
  5. **Suggested Looks** — per-activity swipeable cards showing wardrobe matches + gaps
  6. **Packing List** — consolidated list, copy-to-clipboard export

### 4. Navigation
- Add "My Trips" to sidebar navigation
- Add route to App.tsx

### Tech Notes
- Open-Meteo API = no API key required
- City geocoding via Open-Meteo geocoding API (also free)
- Conversational card UI with framer-motion transitions
- Packing list shareable via clipboard
