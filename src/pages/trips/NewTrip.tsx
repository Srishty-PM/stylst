import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, MapPin, Calendar as CalIcon, Sun, CloudRain, Cloud, Thermometer, Check, Copy, Plane, Heart, X, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSaveTrip } from "@/hooks/useTrips";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

const ACTIVITIES = [
  { id: "pool-day", label: "Pool Day", emoji: "🏊" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "casual-sightseeing", label: "Casual Sightseeing", emoji: "📸" },
  { id: "dinner-out", label: "Dinner Out", emoji: "🍽️" },
  { id: "date-night", label: "Date Night", emoji: "🌹" },
  { id: "club", label: "Club", emoji: "🪩" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "long-flights", label: "Long Flights", emoji: "✈️" },
];

type Step = "destination" | "dates" | "weather" | "activities" | "loading" | "looks" | "packing";

type CityResult = {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

type WeatherData = {
  summary: string;
  avg_high: number;
  avg_low: number;
  condition: string;
  days: any[];
};

type LookItem = {
  name: string;
  category: string;
  from_wardrobe: boolean;
  wardrobe_item_id?: string;
  description: string;
  image_url?: string;
};

type Look = {
  activity: string;
  look_name: string;
  items: LookItem[];
  styling_tip: string;
  saved?: boolean;
};

type PackingItem = {
  item_name: string;
  category: string;
  from_wardrobe: boolean;
  used_for: string[];
  packed?: boolean;
};

// Swipe card for looks
const LookSwipeCard = ({
  look,
  onSwipe,
  isTop,
}: {
  look: Look;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const leftOp = useTransform(x, [-150, 0], [0.5, 0]);
  const rightOp = useTransform(x, [0, 150], [0, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) onSwipe(info.offset.x > 0 ? "right" : "left");
  };

  if (!isTop) {
    return (
      <motion.div className="absolute inset-0 rounded-2xl bg-card border border-border shadow-sm" style={{ scale: 0.95, y: 8 }} />
    );
  }

  const wardrobeItems = look.items.filter((i) => i.from_wardrobe);
  const missingItems = look.items.filter((i) => !i.from_wardrobe);

  return (
    <motion.div
      className="absolute inset-0 rounded-2xl bg-card border border-border shadow-lg overflow-hidden cursor-grab active:cursor-grabbing touch-none"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      exit={{ x: 500, opacity: 0, transition: { duration: 0.3 } }}
    >
      <motion.div className="absolute inset-0 bg-destructive/15 z-10 pointer-events-none flex items-center justify-center" style={{ opacity: leftOp }}>
        <X className="w-16 h-16 text-destructive" strokeWidth={3} />
      </motion.div>
      <motion.div className="absolute inset-0 bg-green-500/15 z-10 pointer-events-none flex items-center justify-center" style={{ opacity: rightOp }}>
        <Heart className="w-16 h-16 text-green-600" strokeWidth={3} />
      </motion.div>

      <div className="h-full overflow-y-auto p-5">
        {/* Activity label */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium uppercase tracking-widest text-primary">{look.activity}</span>
        </div>
        <h3 className="font-display text-xl text-foreground mb-3">{look.look_name}</h3>

        {/* From wardrobe */}
        {wardrobeItems.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">From your wardrobe</p>
            <div className="space-y-2">
              {wardrobeItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-contain bg-muted" style={{ imageOrientation: "from-image" }} />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="text-xs text-primary font-medium shrink-0">Owned</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing items */}
        {missingItems.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">You might need</p>
            <div className="space-y-2">
              {missingItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-lg">🛍️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">Shop</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Styling tip */}
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
          <p className="text-xs text-muted-foreground italic">💡 {look.styling_tip}</p>
        </div>
      </div>
    </motion.div>
  );
};

const NewTrip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const saveTrip = useSaveTrip();

  const [step, setStep] = useState<Step>("destination");
  const [destination, setDestination] = useState("");
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [otherActivity, setOtherActivity] = useState("");
  const [looks, setLooks] = useState<Look[]>([]);
  const [currentLookIdx, setCurrentLookIdx] = useState(0);
  const [savedLooks, setSavedLooks] = useState<Look[]>([]);
  const [packingList, setPackingList] = useState<PackingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const searchTimeout = useRef<any>(null);

  // City autocomplete
  const searchCities = useCallback(async (q: string) => {
    if (q.length < 2) { setCityResults([]); return; }
    try {
      const { data, error } = await supabase.functions.invoke("trip-planner", {
        body: { action: "geocode", query: q },
      });
      if (!error && data?.results) setCityResults(data.results);
    } catch { /* ignore */ }
  }, []);

  const handleDestinationChange = (val: string) => {
    setDestination(val);
    setSelectedCity(null);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchCities(val), 300);
  };

  const selectCity = (city: CityResult) => {
    setSelectedCity(city);
    setDestination(`${city.name}, ${city.country}`);
    setCityResults([]);
  };

  // Fetch weather
  const fetchWeather = useCallback(async () => {
    if (!selectedCity || !dateRange?.from || !dateRange?.to) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("trip-planner", {
        body: {
          action: "weather",
          latitude: selectedCity.latitude,
          longitude: selectedCity.longitude,
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to, "yyyy-MM-dd"),
        },
      });
      if (error) throw error;
      setWeather(data);
      setStep("weather");
    } catch (err) {
      toast.error("Could not fetch weather forecast");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, dateRange]);

  // Generate looks
  const generateLooks = useCallback(async () => {
    if (!selectedCity || !dateRange?.from || !dateRange?.to) return;
    setStep("loading");
    try {
      const allActivities = [
        ...selectedActivities.map(id => ACTIVITIES.find(a => a.id === id)?.label || id),
        ...(otherActivity.trim() ? [otherActivity.trim()] : []),
      ];

      const { data, error } = await supabase.functions.invoke("trip-planner", {
        body: {
          action: "suggest",
          destination: destination,
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to, "yyyy-MM-dd"),
          weather_summary: weather,
          activities: allActivities,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setLooks(data.looks || []);
      setPackingList(data.packing_list || []);
      setCurrentLookIdx(0);
      setSavedLooks([]);
      setStep("looks");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate looks");
      setStep("activities");
    }
  }, [selectedCity, dateRange, selectedActivities, otherActivity, destination, weather]);

  // Swipe handler
  const handleSwipe = useCallback((dir: "left" | "right") => {
    const look = looks[currentLookIdx];
    if (dir === "right" && look) {
      setSavedLooks(prev => [...prev, { ...look, saved: true }]);
    }
    if (currentLookIdx + 1 >= looks.length) {
      setStep("packing");
    } else {
      setCurrentLookIdx(prev => prev + 1);
    }
  }, [currentLookIdx, looks]);

  // Save trip
  const handleSaveTrip = useCallback(async () => {
    if (!user || !selectedCity || !dateRange?.from || !dateRange?.to) return;
    try {
      const result = await saveTrip.mutateAsync({
        user_id: user.id,
        destination,
        destination_lat: selectedCity.latitude,
        destination_lng: selectedCity.longitude,
        start_date: format(dateRange.from, "yyyy-MM-dd"),
        end_date: format(dateRange.to, "yyyy-MM-dd"),
        weather_summary: weather,
        activities: selectedActivities,
        suggested_looks: savedLooks as any,
        packing_list: packingList as any,
        status: "planned",
      });
      setTripId(result.id);
      toast.success("Trip saved!");
    } catch {
      toast.error("Failed to save trip");
    }
  }, [user, selectedCity, dateRange, destination, weather, selectedActivities, savedLooks, packingList, saveTrip]);

  // Copy packing list
  const copyPackingList = useCallback(() => {
    const text = packingList
      .map((item, i) => `${i + 1}. ${item.item_name} (${item.category}) — for: ${item.used_for.join(", ")}${item.from_wardrobe ? " ✓ owned" : " 🛍️ need"}`)
      .join("\n");
    const header = `Packing List — ${destination}\n${dateRange?.from ? format(dateRange.from, "MMM d") : ""} – ${dateRange?.to ? format(dateRange.to, "MMM d, yyyy") : ""}\n\n`;
    navigator.clipboard.writeText(header + text);
    toast.success("Packing list copied to clipboard!");
  }, [packingList, destination, dateRange]);

  const weatherIcon = (condition: string) => {
    if (condition.includes("rain")) return <CloudRain className="w-6 h-6 text-blue-400" />;
    if (condition.includes("cloud")) return <Cloud className="w-6 h-6 text-muted-foreground" />;
    return <Sun className="w-6 h-6 text-amber-400" />;
  };

  const pageTransition = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
    transition: { duration: 0.25 },
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step === "destination" ? navigate("/trips") : setStep(
          step === "dates" ? "destination" :
          step === "weather" ? "dates" :
          step === "activities" ? "weather" :
          step === "looks" ? "activities" :
          step === "packing" ? "looks" : "destination"
        )} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl text-foreground">Plan a Trip</h1>
          <p className="text-sm text-muted-foreground">
            {step === "destination" && "Where are you heading?"}
            {step === "dates" && "When are you going?"}
            {step === "weather" && "Here's what to expect"}
            {step === "activities" && "What's on the agenda?"}
            {step === "loading" && "Building your trip wardrobe…"}
            {step === "looks" && "Your trip looks"}
            {step === "packing" && "Your packing list"}
          </p>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex gap-1 mb-6">
        {["destination", "dates", "weather", "activities", "looks", "packing"].map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              ["destination", "dates", "weather", "activities", "loading", "looks", "packing"].indexOf(step) >= i
                ? "bg-primary"
                : "bg-border"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* DESTINATION */}
        {step === "destination" && (
          <motion.div key="dest" {...pageTransition} className="flex-1 flex flex-col">
            <div className="relative mb-4">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="Search for a city…"
                className="pl-10 py-6 text-base"
                autoFocus
              />
            </div>

            {cityResults.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden mb-4 shadow-sm">
                {cityResults.map((city, i) => (
                  <button
                    key={i}
                    onClick={() => selectCity(city)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{city.name}</p>
                      <p className="text-xs text-muted-foreground">{city.admin1 ? `${city.admin1}, ` : ""}{city.country}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto">
              <Button
                onClick={() => setStep("dates")}
                disabled={!selectedCity}
                className="w-full py-6 text-base"
                size="lg"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* DATES */}
        {step === "dates" && (
          <motion.div key="dates" {...pageTransition} className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-4 p-3 bg-card rounded-xl border border-border">
              <MapPin className="w-5 h-5 text-primary" />
              <p className="font-medium text-foreground">{destination}</p>
            </div>

            <div className="flex justify-center mb-6">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                disabled={{ before: new Date() }}
                className="rounded-xl border border-border bg-card p-3"
              />
            </div>

            {dateRange?.from && dateRange?.to && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                {format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")} ({Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000)} days)
              </p>
            )}

            <div className="mt-auto">
              <Button
                onClick={fetchWeather}
                disabled={!dateRange?.from || !dateRange?.to || isLoading}
                className="w-full py-6 text-base"
                size="lg"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Check Weather <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* WEATHER */}
        {step === "weather" && weather && (
          <motion.div key="weather" {...pageTransition} className="flex-1 flex flex-col">
            <div className="bg-card rounded-2xl border border-border p-6 mb-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                {weatherIcon(weather.condition)}
                <h2 className="font-display text-xl text-foreground">{destination}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {dateRange?.from ? format(dateRange.from, "MMM d") : ""} – {dateRange?.to ? format(dateRange.to, "MMM d") : ""}
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Thermometer className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-display text-foreground">{weather.summary}</span>
              </div>
            </div>

            {/* Daily breakdown */}
            {weather.days.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
                {weather.days.slice(0, 14).map((day: any, i: number) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">{format(new Date(day.date), "EEE")}</p>
                    <p className="text-xs font-medium text-foreground">{day.temp_max}°</p>
                    <p className="text-[10px] text-muted-foreground">{day.temp_min}°</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-auto">
              <Button onClick={() => setStep("activities")} className="w-full py-6 text-base" size="lg">
                Plan Activities <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ACTIVITIES */}
        {step === "activities" && (
          <motion.div key="activities" {...pageTransition} className="flex-1 flex flex-col">
            <h2 className="font-display text-lg text-foreground mb-2">What are you planning for this trip?</h2>
            <p className="text-sm text-muted-foreground mb-5">Select all that apply</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {ACTIVITIES.map((act) => {
                const selected = selectedActivities.includes(act.id);
                return (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActivities(prev =>
                      selected ? prev.filter(a => a !== act.id) : [...prev, act.id]
                    )}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 text-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="text-xl">{act.emoji}</span>
                    <span className="font-medium text-sm">{act.label}</span>
                    {selected && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                );
              })}
            </div>

            <div className="mb-6">
              <Input
                value={otherActivity}
                onChange={(e) => setOtherActivity(e.target.value)}
                placeholder="Other activity…"
                className="py-5"
              />
            </div>

            <div className="mt-auto">
              <Button
                onClick={generateLooks}
                disabled={selectedActivities.length === 0 && !otherActivity.trim()}
                className="w-full py-6 text-base"
                size="lg"
              >
                Generate Trip Looks <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* LOADING */}
        {step === "loading" && (
          <motion.div key="loading" {...pageTransition} className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg text-foreground">Packing your trip wardrobe…</p>
              <p className="text-sm text-muted-foreground mt-1">Matching your closet to activities & weather</p>
            </div>
          </motion.div>
        )}

        {/* LOOKS (Swipe) */}
        {step === "looks" && looks.length > 0 && (
          <motion.div key="looks" {...pageTransition} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{currentLookIdx + 1} / {looks.length} looks</p>
              <p className="text-sm text-primary font-medium">{savedLooks.length} saved</p>
            </div>

            <div className="w-full h-1 bg-border rounded-full mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${((currentLookIdx + 1) / looks.length) * 100}%` }}
              />
            </div>

            <div className="relative flex-1 min-h-[420px] max-h-[560px]">
              <AnimatePresence>
                {looks.slice(currentLookIdx, currentLookIdx + 2).map((look, i) => (
                  <LookSwipeCard
                    key={`${look.look_name}-${currentLookIdx + i}`}
                    look={look}
                    onSwipe={handleSwipe}
                    isTop={i === 0}
                  />
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-8 mt-4 pb-2">
              <button onClick={() => handleSwipe("left")} className="w-14 h-14 rounded-full border-2 border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/5 transition-colors">
                <X className="w-7 h-7" />
              </button>
              <p className="text-xs text-muted-foreground">Swipe or tap</p>
              <button onClick={() => handleSwipe("right")} className="w-14 h-14 rounded-full border-2 border-green-500/30 flex items-center justify-center text-green-600 hover:bg-green-500/5 transition-colors">
                <Heart className="w-7 h-7" />
              </button>
            </div>
          </motion.div>
        )}

        {/* PACKING LIST */}
        {step === "packing" && (
          <motion.div key="packing" {...pageTransition} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg text-foreground">Your Packing List</h2>
                <p className="text-sm text-muted-foreground">{packingList.length} items for {destination}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyPackingList}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            </div>

            {savedLooks.length > 0 && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                <p className="text-sm text-foreground font-medium">💚 You saved {savedLooks.length} look{savedLooks.length !== 1 ? "s" : ""}</p>
              </div>
            )}

            <div className="space-y-2 mb-6 flex-1 overflow-y-auto">
              {/* Owned items */}
              {packingList.filter(i => i.from_wardrobe).length > 0 && (
                <>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2 mt-2">From your wardrobe</p>
                  {packingList.filter(i => i.from_wardrobe).map((item, i) => (
                    <label key={`own-${i}`} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={item.packed}
                        onChange={() => setPackingList(prev => prev.map((p, j) => p === item ? { ...p, packed: !p.packed } : p))}
                        className="w-5 h-5 rounded border-border text-primary accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.packed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.used_for.join(", ")}</p>
                      </div>
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    </label>
                  ))}
                </>
              )}

              {/* Items to buy */}
              {packingList.filter(i => !i.from_wardrobe).length > 0 && (
                <>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2 mt-4">Items to shop</p>
                  {packingList.filter(i => !i.from_wardrobe).map((item, i) => (
                    <label key={`buy-${i}`} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={item.packed}
                        onChange={() => setPackingList(prev => prev.map(p => p === item ? { ...p, packed: !p.packed } : p))}
                        className="w-5 h-5 rounded border-border text-primary accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.packed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.used_for.join(", ")}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">🛍️</span>
                    </label>
                  ))}
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <Button onClick={handleSaveTrip} disabled={saveTrip.isPending} className="w-full py-6 text-base" size="lg">
                {saveTrip.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plane className="w-5 h-5 mr-2" />}
                Save Trip
              </Button>
              <Button variant="outline" onClick={() => navigate("/trips")} className="w-full" size="lg">
                View My Trips
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewTrip;
