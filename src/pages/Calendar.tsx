import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns';

const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0=Sun

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

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}

        {/* Empty cells for start offset */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {days.map(day => (
          <button
            key={day.toISOString()}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors ${
              isToday(day)
                ? 'bg-accent text-accent-foreground font-bold'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Plan your outfits in advance</p>
          <p className="text-xs text-muted-foreground">Never have a "nothing to wear" morning again!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;
