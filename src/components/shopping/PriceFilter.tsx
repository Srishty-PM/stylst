import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal } from 'lucide-react';

interface PriceFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  currency?: string;
}

const PriceFilter = ({ min, max, value, onChange, currency = '£' }: PriceFilterProps) => {
  const presets: [number, number][] = [[0, 25], [25, 50], [50, 100], [100, 200], [200, max]];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />Budget</span>
        <span className="text-xs font-semibold text-primary">{currency}{value[0]} – {currency}{value[1]}</span>
      </div>
      <Slider min={min} max={max} step={5} value={value} onValueChange={v => onChange(v as [number, number])} aria-label="Price range filter" />
      <div className="flex gap-1.5 flex-wrap">
        {presets.filter(([low]) => low < max).map(([low, high], index) => {
          const range: [number, number] = [Math.max(min, low), Math.min(high, max)];
          const active = value[0] === range[0] && value[1] === range[1];
          const label = index === 0 ? `Under ${currency}25` : low === 200 ? `${currency}200+` : `${currency}${low}–${currency}${range[1]}`;
          return <button type="button" key={low} aria-pressed={active} onClick={() => onChange(range)} className={`px-3 py-2 rounded-full text-xs border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary'}`}>{label}</button>;
        })}
      </div>
    </div>
  );
};

export default PriceFilter;
