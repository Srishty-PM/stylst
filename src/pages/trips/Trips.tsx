import { useNavigate } from "react-router-dom";
import { Plus, Plane, MapPin, Calendar as CalIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrips, useDeleteTrip, Trip } from "@/hooks/useTrips";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Trips = () => {
  const navigate = useNavigate();
  const { data: trips, isLoading } = useTrips();
  const deleteTrip = useDeleteTrip();

  const handleDelete = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    try {
      await deleteTrip.mutateAsync(tripId);
      toast.success("Trip deleted");
    } catch {
      toast.error("Failed to delete trip");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-foreground">My Trips</h1>
          <p className="text-sm text-muted-foreground">Plan outfits for your travels</p>
        </div>
        <Button onClick={() => navigate("/trips/new")} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Plan a Trip
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !trips || trips.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Plane className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-xl text-foreground mb-2">No trips yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Plan your next trip and we'll help you pack the perfect outfits
          </p>
          <Button onClick={() => navigate("/trips/new")}>
            <Plus className="w-4 h-4 mr-1" /> Plan Your First Trip
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/trips/${trip.id}`)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground">{trip.destination}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <CalIcon className="w-3.5 h-3.5" />
                      <span>
                        {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    {trip.activities?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {trip.activities.length} activities • {(trip.suggested_looks as any[])?.length || 0} looks
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, trip.id)}
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trips;
