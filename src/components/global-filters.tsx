import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  businessUnits,
  customers,
  periods,
  plants,
  productFamilies,
  forecastVersions,
  skus,
  type Filters,
} from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { RotateCcw } from "lucide-react";

type Option = { id: string; label: string };

const skuOptions: Option[] = [
  { id: "all", label: "All SKUs" },
  ...skus.map((s) => ({ id: s.sku, label: `${s.sku} — ${s.description}` })),
];

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className ?? ""}`}>
      <span className="label-caps">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full border-input bg-surface text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function GlobalFilters() {
  const { filters, setFilter, resetFilters } = usePlatform();

  const items: Array<{ key: keyof Filters; label: string; options: Option[] }> = [
    { key: "bu", label: "Business unit", options: businessUnits },
    { key: "customer", label: "Customer / OEM", options: customers },
    { key: "family", label: "Product family", options: productFamilies },
    { key: "sku", label: "SKU", options: skuOptions },
    { key: "plant", label: "Plant / location", options: plants },
    { key: "period", label: "Forecast period", options: periods },
    { key: "version", label: "Forecast version", options: forecastVersions },
  ];

  return (
    <div className="border-b border-border bg-surface-muted px-4 py-2.5 sm:px-6">
      <div className="flex items-end gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-4 xl:grid-cols-7">
          {items.map((item) => (
            <FilterSelect
              key={item.key}
              label={item.label}
              value={filters[item.key]}
              options={item.options}
              onChange={(value) => setFilter(item.key, value)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="mb-0.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-input bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
}
