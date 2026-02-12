import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Check, Trash2, Loader2 } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, addMonths, subMonths, getDay, isSameDay, parseISO,
} from 'date-fns';
import { useScheduledOutfits, useAddScheduledOutfit, useMarkWorn, useDeleteScheduledOutfit } from '@/hooks/useScheduledOutfits';
import { useLooks } from '@/hooks/useLooks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Calendar = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLookId, setSelectedLookId] = useState('');
  const [eventName, setEventName] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const { data: scheduled = [], isLoading } = useScheduledOutfits(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd')
  );
  const { data: looks = [] } = useLooks();
  const addOutfit = useAddScheduledOutfit();
  const markWorn = useMarkWorn();
  const deleteOutfit = useDeleteScheduledOutfit();

  const getOutfitsForDay = (day: Date) =>
    scheduled.filter(s => isSameDay(parseISO(s.scheduled_date), day));

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
      setDialogOpen(false);
      setSelectedLookId('');
      setEventName('');
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
      toast({ title: 'Removed from schedule' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const selectedDayOutfits = selectedDate ? getOutfitsForDay(selectedDate) : [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Outfit Calendar</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display text-lg font-semibold text-foreground">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}

        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(day => {
          const dayOutfits = getOutfitsForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative ${
                isToday(day)
                  ? 'bg-accent text-accent-foreground font-bold'
                  : isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              {format(day, 'd')}
              {dayOutfits.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayOutfits.slice(0, 3).map((o, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${o.was_worn ? 'bg-success' : 'bg-accent'}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{format(selectedDate, 'EEEE, MMMM d')}</h3>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={looks.length === 0}>
                    <Plus className="w-4 h-4 mr-1" /> Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Outfit for {format(selectedDate, 'PPP')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Select Outfit *</Label>
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
                      <Label>Event (optional)</Label>
                      <Input
                        value={eventName}
                        onChange={e => setEventName(e.target.value)}
                        placeholder="e.g. Team dinner, Date night"
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!selectedLookId || addOutfit.isPending}
                      onClick={handleSchedule}
                    >
                      {addOutfit.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarDays className="w-4 h-4 mr-1" />}
                      {addOutfit.isPending ? 'Scheduling...' : 'Schedule Outfit'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {selectedDayOutfits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outfits scheduled for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayOutfits.map(outfit => {
                  const look = looks.find(l => l.id === outfit.matched_look_id);
                  return (
                    <div key={outfit.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">{look?.name || 'Unknown look'}</p>
                        {outfit.event_name && (
                          <p className="text-xs text-muted-foreground">{outfit.event_name}</p>
                        )}
                        {outfit.was_worn && (
                          <Badge variant="secondary" className="text-[10px] mt-1">Worn ✓</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!outfit.was_worn && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarkWorn(outfit.id)}
                            disabled={markWorn.isPending}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(outfit.id)}
                          disabled={deleteOutfit.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {looks.length === 0 && (
              <p className="text-xs text-muted-foreground">Create some outfits in the Looks section first to schedule them here.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state when no date selected */}
      {!selectedDate && scheduled.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Tap a day to plan your outfit</p>
            <p className="text-xs text-muted-foreground">Never have a "nothing to wear" morning again!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Calendar;
