import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortOption = 'recommended' | 'price_asc' | 'price_desc' | 'newest';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const options: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'newest', label: 'Newest' },
];

const SortDropdown = ({ value, onChange }: SortDropdownProps) => (
  <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
    <SelectTrigger className="h-7 w-[140px] text-[10px] border-border" aria-label="Sort products">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value} className="text-xs">
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default SortDropdown;
