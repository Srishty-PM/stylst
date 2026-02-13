import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal } from 'lucide-react';

interface PriceFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  currency?: string;
}

const presets = [
  { label: 'Under £25', range: [0, 25] as [number, number] },
  { label: '£25–£50', range: [25, 50] as [number, number] },
  { label: '£50–£100', range: [50, 100] as [number, number] },
  { label: '£100–£200', range: [100, 200] as [number, number] },
  { label: '£200+', range: [200, 500] as [number, number] },
];

const PriceFilter = ({ min, max, value, onChange, currency = '£' }: PriceFilterProps) => {
  const isPresetActive = (preset: [number, number]) =>
    value[0] === preset[0] && value[1] === Math.min(preset[1], max);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          Price Range
        </span>
        <span className="text-xs font-semibold text-primary">
          {currency}{value[0]} – {currency}{value[1]}
        </span>
      </div>

      <Slider
        min={min}
        max={max}
        step={5}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        className="w-full"
        aria-label="Price range filter"
      />

      <div className="flex gap-1.5 flex-wrap">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange([p.range[0], Math.min(p.range[1], max)])}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
              isPresetActive(p.range)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PriceFilter;
