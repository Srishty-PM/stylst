import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Camera, X, Check, Heart, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAddInspiration, uploadInspirationImage } from "@/hooks/useInspirations";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";

const OCCASIONS = [
  { id: "casual", label: "Casual", emoji: "👟" },
  { id: "formal", label: "Formal", emoji: "👔" },
  { id: "date-night", label: "Date Night", emoji: "🌹" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "brunch", label: "Brunch", emoji: "🥂" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "party", label: "Party", emoji: "🎉" },
];

type ItemAnalysis = {
  type: string;
  color: string;
  fabric: string | null;
  style_notes: string;
};

type OutfitPiece = {
  item_type: string;
  description: string;
  is_hero: boolean;
};

type OutfitSuggestion = {
  name: string;
  pieces: OutfitPiece[];
  vibe: string;
  image_url: string | null;
  image_prompt: string;
};

type Phase = "upload" | "occasion" | "loading" | "swipe" | "summary";

const SwipeCard = ({
  outfit,
  heroItem,
  onSwipe,
  isTop,
}: {
  outfit: OutfitSuggestion;
  heroItem: ItemAnalysis;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const leftOpacity = useTransform(x, [-150, 0], [0.6, 0]);
  const rightOpacity = useTransform(x, [0, 150], [0, 0.6]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(info.offset.x > 0 ? "right" : "left");
    }
  };

  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
        style={{ scale: 0.95, y: 8 }}
      />
    );
  }

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
      {/* Swipe overlays */}
      <motion.div
        className="absolute inset-0 bg-destructive/20 z-10 pointer-events-none flex items-center justify-center"
        style={{ opacity: leftOpacity }}
      >
        <X className="w-20 h-20 text-destructive" strokeWidth={3} />
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-green-500/20 z-10 pointer-events-none flex items-center justify-center"
        style={{ opacity: rightOpacity }}
      >
        <Heart className="w-20 h-20 text-green-600" strokeWidth={3} />
      </motion.div>

      {/* Image */}
      <div className="relative h-[55%] bg-muted">
        {outfit.image_url ? (
          <img
            src={outfit.image_url}
            alt={outfit.name}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Sparkles className="w-12 h-12" />
          </div>
        )}
        {/* Hero badge */}
        <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
          ✨ Styled around your {heroItem.color} {heroItem.type}
        </div>
      </div>

      {/* Info */}
      <div className="p-5 h-[45%] overflow-y-auto">
        <h3 className="font-display text-xl text-foreground mb-1">{outfit.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{outfit.vibe}</p>
        <div className="space-y-1.5">
          {outfit.pieces.map((piece, i) => (
            <div
              key={i}
              className={`text-sm flex items-start gap-2 ${
                piece.is_hero
                  ? "text-primary font-medium"
                  : "text-foreground"
              }`}
            >
              <span className="mt-0.5">{piece.is_hero ? "⭐" : "•"}</span>
              <span>
                <span className="font-medium">{piece.item_type}:</span> {piece.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const StyleMyItem = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const addInspiration = useAddInspiration();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [itemAnalysis, setItemAnalysis] = useState<ItemAnalysis | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string>("casual");
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedOutfits, setSavedOutfits] = useState<OutfitSuggestion[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user) return;
    setIsUploading(true);
    try {
      const url = await uploadInspirationImage(user.id, file);
      setUploadedImageUrl(url);
      setPhase("occasion");
    } catch (err) {
      toast.error("Failed to upload image");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  const handleGenerate = useCallback(async () => {
    if (!uploadedImageUrl || !user) return;
    setPhase("loading");

    try {
      const { data, error } = await supabase.functions.invoke("style-my-item", {
        body: {
          image_url: uploadedImageUrl,
          occasion: selectedOccasion,
          item_analysis: itemAnalysis,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setItemAnalysis(data.item_analysis);
      setOutfits(data.outfits || []);
      setCurrentIndex(0);
      setSavedOutfits([]);
      setPhase("swipe");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate outfit ideas");
      setPhase("occasion");
    }
  }, [uploadedImageUrl, selectedOccasion, itemAnalysis, user]);

  const handleSwipe = useCallback(
    async (dir: "left" | "right") => {
      const outfit = outfits[currentIndex];
      if (dir === "right" && outfit) {
        setSavedOutfits((prev) => [...prev, outfit]);
        // Save to inspiration board
        if (user && outfit.image_url) {
          try {
            await addInspiration.mutateAsync({
              user_id: user.id,
              image_url: outfit.image_url,
              description: `${outfit.name} — ${outfit.vibe}`,
              detected_items: outfit.pieces.map((p) => `${p.item_type}: ${p.description}`),
            });
          } catch (err) {
            console.error("Failed to save to inspiration:", err);
          }
        }
      }

      if (currentIndex + 1 >= outfits.length) {
        setPhase("summary");
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [currentIndex, outfits, user, addInspiration]
  );

  const handleChangeOccasion = useCallback((occasion: string) => {
    setSelectedOccasion(occasion);
  }, []);

  const handleRegenerate = useCallback(() => {
    setPhase("occasion");
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl text-foreground">Style My Item</h1>
          <p className="text-sm text-muted-foreground">Get outfit ideas for any piece</p>
        </div>
      </div>

      {/* Upload Phase */}
      {phase === "upload" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center gap-6"
        >
          <div
            className="w-full max-w-sm aspect-square rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center px-6">
                  <p className="font-medium text-foreground">Upload a clothing item</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Take a photo or upload an image of a single piece
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </motion.div>
      )}

      {/* Occasion Phase */}
      {phase === "occasion" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col"
        >
          {/* Uploaded item preview */}
          {uploadedImageUrl && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-card rounded-xl border border-border">
              <img
                src={uploadedImageUrl}
                alt="Your item"
                className="w-20 h-20 rounded-lg object-contain bg-muted"
                style={{ imageOrientation: "from-image" }}
              />
              <div className="flex-1">
                {itemAnalysis ? (
                  <>
                    <p className="font-medium text-foreground capitalize">
                      {itemAnalysis.color} {itemAnalysis.type}
                    </p>
                    <p className="text-sm text-muted-foreground">{itemAnalysis.style_notes}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">AI will analyze your item</p>
                )}
              </div>
              <button
                onClick={() => { setPhase("upload"); setUploadedImageUrl(null); setItemAnalysis(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <h2 className="font-display text-lg text-foreground mb-4">What's the occasion?</h2>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {OCCASIONS.map((occ) => (
              <button
                key={occ.id}
                onClick={() => handleChangeOccasion(occ.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                  selectedOccasion === occ.id
                    ? "border-primary bg-primary/5 text-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{occ.emoji}</span>
                <span className="font-medium text-sm">{occ.label}</span>
              </button>
            ))}
          </div>

          <Button onClick={handleGenerate} className="w-full py-6 text-base" size="lg">
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Outfits
          </Button>
        </motion.div>
      )}

      {/* Loading Phase */}
      {phase === "loading" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 border-2 border-primary/20 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-display text-lg text-foreground">Styling your item…</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generating outfit ideas with AI imagery
            </p>
          </div>
        </motion.div>
      )}

      {/* Swipe Phase */}
      {phase === "swipe" && outfits.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} / {outfits.length}
            </p>
            <button
              onClick={handleRegenerate}
              className="text-sm text-primary font-medium hover:underline"
            >
              Change occasion
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-border rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((currentIndex + 1) / outfits.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Card stack */}
          <div className="relative flex-1 min-h-[480px] max-h-[600px]">
            <AnimatePresence>
              {outfits.slice(currentIndex, currentIndex + 2).map((outfit, i) => (
                <SwipeCard
                  key={`${outfit.name}-${currentIndex + i}`}
                  outfit={outfit}
                  heroItem={itemAnalysis!}
                  onSwipe={handleSwipe}
                  isTop={i === 0}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Swipe hint + buttons */}
          <div className="flex items-center justify-center gap-8 mt-4 pb-2">
            <button
              onClick={() => handleSwipe("left")}
              className="w-14 h-14 rounded-full border-2 border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/5 transition-colors"
            >
              <X className="w-7 h-7" />
            </button>
            <p className="text-xs text-muted-foreground">Swipe or tap</p>
            <button
              onClick={() => handleSwipe("right")}
              className="w-14 h-14 rounded-full border-2 border-green-500/30 flex items-center justify-center text-green-600 hover:bg-green-500/5 transition-colors"
            >
              <Heart className="w-7 h-7" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Summary Phase */}
      {phase === "summary" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-6 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground">
              You saved {savedOutfits.length} look{savedOutfits.length !== 1 ? "s" : ""}
            </h2>
            <p className="text-muted-foreground mt-1">
              {savedOutfits.length > 0
                ? "They've been added to your Inspiration Board"
                : "No looks saved this time — try a different occasion!"}
            </p>
          </div>

          {/* Saved thumbnails */}
          {savedOutfits.length > 0 && (
            <div className="flex gap-3 flex-wrap justify-center max-w-sm">
              {savedOutfits.map((outfit, i) =>
                outfit.image_url ? (
                  <img
                    key={i}
                    src={outfit.image_url}
                    alt={outfit.name}
                    className="w-20 h-20 rounded-lg object-cover border border-border"
                  />
                ) : null
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <Button onClick={() => navigate("/inspiration")} className="w-full" size="lg">
              View Inspiration Board
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPhase("occasion");
                setCurrentIndex(0);
                setSavedOutfits([]);
              }}
              className="w-full"
              size="lg"
            >
              Try Another Occasion
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("upload");
                setUploadedImageUrl(null);
                setItemAnalysis(null);
                setOutfits([]);
                setCurrentIndex(0);
                setSavedOutfits([]);
              }}
              className="w-full"
              size="lg"
            >
              Style a Different Item
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StyleMyItem;
