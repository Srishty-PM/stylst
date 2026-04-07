import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar as CalIcon, Thermometer, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrip } from "@/hooks/useTrips";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading } = useTrip(tripId);
  const [packedItems, setPackedItems] = useState<Set<number>>(new Set());

  const togglePacked = (idx: number) => {
    setPackedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const copyPackingList = () => {
    if (!trip) return;
    const list = (trip.packing_list as any[])
      .map((item: any, i: number) => `${i + 1}. ${item.item_name} (${item.category}) — ${item.used_for?.join(", ")}${item.from_wardrobe ? " ✓" : " 🛍️"}`)
      .join("\n");
    navigator.clipboard.writeText(`Packing List — ${trip.destination}\n\n${list}`);
    toast.success("Copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Trip not found</p>
        <Button variant="outline" onClick={() => navigate("/trips")} className="mt-4">Back to Trips</Button>
      </div>
    );
  }

  const weather = trip.weather_summary as any;
  const looks = trip.suggested_looks as any[];
  const packingList = trip.packing_list as any[];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/trips")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl text-foreground">{trip.destination}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Weather card */}
      {weather?.summary && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center gap-3">
          <Thermometer className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-foreground">{weather.summary}</p>
        </div>
      )}

      {/* Saved looks */}
      {looks?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg text-foreground mb-3">Saved Looks</h2>
          <div className="space-y-3">
            {looks.map((look: any, i: number) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">{look.activity}</p>
                <h3 className="font-medium text-foreground mb-2">{look.look_name}</h3>
                <div className="space-y-1">
                  {look.items?.map((item: any, j: number) => (
                    <p key={j} className="text-sm text-muted-foreground">
                      {item.from_wardrobe ? "✓" : "🛍️"} {item.name} — {item.description}
                    </p>
                  ))}
                </div>
                {look.styling_tip && (
                  <p className="text-xs text-muted-foreground italic mt-2">💡 {look.styling_tip}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Packing list */}
      {packingList?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-foreground">Packing List</h2>
            <Button variant="outline" size="sm" onClick={copyPackingList}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
          </div>
          <div className="space-y-2">
            {packingList.map((item: any, i: number) => (
              <label key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={packedItems.has(i)}
                  onChange={() => togglePacked(i)}
                  className="w-5 h-5 rounded accent-primary"
                />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${packedItems.has(i) ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{item.used_for?.join(", ")}</p>
                </div>
                {item.from_wardrobe ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <span className="text-xs text-muted-foreground">🛍️</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetail;
