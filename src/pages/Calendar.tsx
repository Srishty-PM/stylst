import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Plus, Flame, Shirt, Heart, Camera, Loader2, Check, Trash2 } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, addMonths, subMonths, getDay, isSameDay, parseISO,
} from 'date-fns';
import { useScheduledOutfits, useAddScheduledOutfit, useMarkWorn, useDeleteScheduledOutfit } from '@/hooks/useScheduledOutfits';
import { useLooks } from '@/hooks/useLooks';
import { useClosetItems } from '@/hooks/useClosetItems';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageView } from '@/hooks/useAnalytics';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const Calendar = () => {
  usePageView('calendar');
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLookId, setSelectedLookId] = useState('');
  const [eventName, setEventName] = useState('');
  const [addMode, setAddMode] = useState<'looks' | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const { data: scheduled = [] } = useScheduledOutfits(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd')
  );
  const { data: looks = [] } = useLooks();
  const { data: closetItems = [] } = useClosetItems();
  const addOutfit = useAddScheduledOutfit();
  const markWorn = useMarkWorn();
  const deleteOutfit = useDeleteScheduledOutfit();

  // Build a map: lookId -> first closet item image
  const lookThumbnails = useMemo(() => {
    const map: Record<string, string> = {};
    looks.forEach(look => {
      if (look.closet_item_ids?.length) {
        const item = closetItems.find(ci => ci.id === look.closet_item_ids[0]);
        if (item) {
          map[look.id] = item.image_url_cleaned || item.image_url;
        }
      }
    });
    return map;
  }, [looks, closetItems]);

  const getOutfitsForDay = (day: Date) =>
    scheduled.filter(s => isSameDay(parseISO(s.scheduled_date), day));

  // Calculate streak
  const streak = useMemo(() => {
    const wornDates = scheduled
      .filter(s => s.was_worn)
      .map(s => parseISO(s.scheduled_date).toDateString());
    const unique = [...new Set(wornDates)].sort().reverse();
    let count = 0;
    const today = new Date();
    for (let i = 0; i < unique.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (unique[i] === expected.toDateString()) count++;
      else break;
    }
    return count;
  }, [scheduled]);

  const handleDayClick = (day: Date) => {
    const dayOutfits = getOutfitsForDay(day);
    setSelectedDate(day);
    if (dayOutfits.length > 0) {
      setDetailSheetOpen(true);
    } else {
      setAddSheetOpen(true);
    }
  };

  const handleAddClick = (day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(day);
    setAddSheetOpen(true);
  };

  const handleSelectFromLooks = () => {
    setAddMode('looks');
    setAddSheetOpen(false);
    setTimeout(() => setAddSheetOpen(true), 100);
  };

  const handleSchedule = async () => {
    if (!user || !selectedDate || !selectedLookId) return;
    try {
      await addOutfit.mutateAsync({
        user_id: user.id,
        matched_look_id: selectedLookId,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        event_name: eventName || null,
      });
      toast({ title: 'Scheduled!', description: `Outfit planned for ${format(selectedDate, 'PPP')}` });
      setAddSheetOpen(false);
      setSelectedLookId('');
      setEventName('');
      setAddMode(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleMarkWorn = async (id: string) => {
    try {
      await markWorn.mutateAsync(id);
      toast({ title: 'Marked as worn!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOutfit.mutateAsync(id);
      toast({ title: 'Removed' });
      setDetailSheetOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const selectedDayOutfits = selectedDate ? getOutfitsForDay(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-foreground" />
          <span className="font-display text-lg font-semibold text-foreground">{streak}</span>
        </div>
        <div />
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-base font-medium text-foreground tracking-wide">
          {format(currentMonth, 'MMM yyyy')}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Weekday headers */}
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}

        {/* Empty cells */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="border-t border-border" />
        ))}

        {/* Day cells */}
        {days.map(day => {
          const dayOutfits = getOutfitsForDay(day);
          const hasOutfit = dayOutfits.length > 0;
          const firstOutfit = dayOutfits[0];
          const thumbUrl = firstOutfit ? lookThumbnails[firstOutfit.matched_look_id] : null;
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className="border-t border-border min-h-[90px] flex flex-col items-center py-1 cursor-pointer hover:bg-muted/30 transition-colors relative"
            >
              {/* Date number */}
              <div className={`w-7 h-7 flex items-center justify-center text-sm z-10 ${
                today
                  ? 'bg-foreground text-background rounded-full font-bold'
                  : 'text-foreground'
              }`}>
                {format(day, 'd')}
              </div>

              {/* Outfit thumbnail or add button */}
              {hasOutfit && thumbUrl ? (
                <div className="flex-1 flex items-center justify-center px-1 py-1">
                  <img
                    src={thumbUrl}
                    alt="Outfit"
                    className="max-h-[52px] w-auto object-contain rounded-sm"
                    loading="lazy"
                  />
                  {dayOutfits.length > 1 && (
                    <span className="absolute bottom-1 right-1 text-[10px] text-muted-foreground font-medium">
                      +{dayOutfits.length - 1}
                    </span>
                  )}
                </div>
              ) : hasOutfit ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shirt className="w-4 h-4 text-primary" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => handleAddClick(day, e)}
                  className="flex-1 flex items-center justify-center opacity-30 hover:opacity-60 transition-opacity"
                >
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add outfit bottom sheet */}
      <Sheet open={addSheetOpen && !addMode} onOpenChange={(open) => { setAddSheetOpen(open); if (!open) setAddMode(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-foreground text-background border-none px-6 pb-8">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-background font-display text-base">
              {selectedDate ? format(selectedDate, 'MMM dd') : ''}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-0">
            <button
              onClick={handleSelectFromLooks}
              className="w-full flex items-center justify-between py-4 border-b border-background/10 text-background/90 hover:text-background transition-colors"
            >
              <span className="text-sm font-medium tracking-wide">From saved looks</span>
              <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Look picker sheet */}
      <Sheet open={addSheetOpen && addMode === 'looks'} onOpenChange={(open) => { setAddSheetOpen(open); if (!open) setAddMode(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-base">
              Select a Look — {selectedDate ? format(selectedDate, 'MMM dd') : ''}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Outfit</Label>
              <Select value={selectedLookId} onValueChange={setSelectedLookId}>
                <SelectTrigger><SelectValue placeholder="Choose a look" /></SelectTrigger>
                <SelectContent>
                  {looks.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Event (optional)</Label>
              <Input
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="e.g. Team dinner"
                className="text-sm"
              />
            </div>
            <Button
              className="w-full uppercase tracking-wider text-xs font-semibold"
              disabled={!selectedLookId || addOutfit.isPending}
              onClick={handleSchedule}
            >
              {addOutfit.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {addOutfit.isPending ? 'Scheduling...' : 'Schedule Outfit'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Day detail sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="font-display text-base">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : ''}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 pb-4">
            {selectedDayOutfits.map(outfit => {
              const look = looks.find(l => l.id === outfit.matched_look_id);
              const thumb = lookThumbnails[outfit.matched_look_id];
              return (
                <div key={outfit.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {thumb && (
                    <img src={thumb} alt="" className="w-12 h-16 object-contain rounded-sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{look?.name || 'Outfit'}</p>
                    {outfit.event_name && (
                      <p className="text-xs text-muted-foreground">{outfit.event_name}</p>
                    )}
                    {outfit.was_worn && (
                      <span className="text-[10px] text-primary font-medium uppercase tracking-wider">Worn ✓</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!outfit.was_worn && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkWorn(outfit.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(outfit.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              variant="outline"
              className="w-full text-xs uppercase tracking-wider"
              onClick={() => { setDetailSheetOpen(false); setAddSheetOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Another
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Calendar;
