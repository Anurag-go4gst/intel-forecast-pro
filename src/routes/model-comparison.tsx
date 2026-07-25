import { createFileRoute } from "@tanstack/react-router";
import { CheckCheck, Cpu, GitCompareArrows, Trophy } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiTile, Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { backtestSeries, filterSkus, models } from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/model-comparison")({
  head: () => ({
    meta: [
      { title: "Model Comparison — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Compare statistical and machine-learning model accuracy, bias and backtest fit, then select the most suitable model per SKU, customer and location.",
      },
      { property: "og:title", content: "Model Comparison — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Model accuracy comparison and per-combination model selection.",
      },
    ],
  }),
  component: ModelComparison,
});

function ModelComparison() {
  const { filters, selectedModelBySku, setSelectedModel } = usePlatform();
  const rows = filterSkus(filters);
  const [championId, setChampionId] = useState("m-gbt");
  const champion = models.find((m) => m.id === championId)!;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Model Comparison"
        subtitle="Evaluate the candidate model library on holdout performance, then confirm the selected model for each SKU, customer and location combination. Selection can be automatic or planner-directed."
        actions={
          <StatusPill tone="info">
            <Cpu className="h-3 w-3" aria-hidden /> 6 candidate models · 1,284 combinations scored
          </StatusPill>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Champion model" value={champion.name.split(" ")[0]} delta={champion.family} deltaTone="info" icon={Trophy} />
        <KpiTile label="Champion MAPE" value={champion.mape.toFixed(1)} unit="%" delta="Holdout: last 6 months" deltaTone="positive" icon={GitCompareArrows} />
        <KpiTile label="Champion bias" value={`${champion.bias > 0 ? "+" : ""}${champion.bias.toFixed(1)}%`} delta={Math.abs(champion.bias) < 2 ? "Within tolerance" : "Monitor"} deltaTone={Math.abs(champion.bias) < 2 ? "positive" : "warning"} icon={CheckCheck} />
        <KpiTile label="Auto-selected combinations" value="1,066" delta="83% of scope" deltaTone="positive" icon={Cpu} />
      </div>

      <Panel
        title="Candidate model library"
        description="Ranked by weighted absolute percentage error on the holdout window. Select a model to set it as the default champion for the scope."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Model</th>
                <th className="label-caps px-4 py-2.5">Type</th>
                <th className="label-caps px-4 py-2.5 text-right">MAPE</th>
                <th className="label-caps px-4 py-2.5 text-right">WAPE</th>
                <th className="label-caps px-4 py-2.5 text-right">Bias</th>
                <th className="label-caps px-4 py-2.5 text-right">MAE</th>
                <th className="label-caps px-4 py-2.5">Training window</th>
                <th className="label-caps px-4 py-2.5">Best suited to</th>
                <th className="label-caps px-4 py-2.5 text-right">Champion</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr
                  key={model.id}
                  className={cn(
                    "border-b border-border last:border-0",
                    championId === model.id ? "bg-accent/60" : "hover:bg-surface-muted/60",
                  )}
                >
                  <td className="px-4 py-2.5 font-medium">{model.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{model.family}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{model.mape.toFixed(1)}%</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{model.wape.toFixed(1)}%</td>
                  <td className="num px-4 py-2.5 text-right text-xs">
                    <span className={Math.abs(model.bias) > 4 ? "text-risk" : Math.abs(model.bias) > 2 ? "text-warning-foreground" : "text-positive"}>
                      {model.bias > 0 ? "+" : ""}
                      {model.bias.toFixed(1)}%
                    </span>
                  </td>
                  <td className="num px-4 py-2.5 text-right text-xs">{model.mae}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {model.trainingWindow} · {model.runtime}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{model.bestFor}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setChampionId(model.id)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        championId === model.id
                          ? "bg-primary text-primary-foreground"
                          : "border border-input hover:bg-accent",
                      )}
                    >
                      {championId === model.id ? "Selected" : "Set default"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Backtest fit against actuals"
          description="Indexed holdout comparison, Jan – Jun 2026 (actual = 100 base)."
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={backtestSeries} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={36} />
                <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--color-primary)" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="gbt" name="Gradient boosted trees" stroke="var(--color-accent-blue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sarima" name="SARIMA" stroke="var(--color-positive)" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="lstm" name="LSTM" stroke="var(--color-warning)" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="croston" name="Croston" stroke="var(--color-risk)" strokeWidth={1.6} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            {[
              ["Actual", "bg-primary"],
              ["Gradient boosted trees", "bg-accent-blue"],
              ["SARIMA", "bg-positive"],
              ["LSTM", "bg-warning"],
              ["Croston", "bg-risk"],
            ].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", color)} /> {label}
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Model selection by combination"
          description="Override the automatic selection where planners have a strong reason."
          bodyClassName="p-0"
        >
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="sticky top-0 bg-surface-muted">
                <tr className="border-b border-border text-left">
                  <th className="label-caps px-4 py-2.5">Combination</th>
                  <th className="label-caps px-4 py-2.5">Selected model</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sku} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <p className="num text-xs font-semibold">{row.sku}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{row.customer}</p>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={selectedModelBySku[row.sku] ?? row.bestModel}
                        onChange={(event) => setSelectedModel(row.sku, event.target.value)}
                        className="h-7 w-full rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                      >
                        {models.map((model) => (
                          <option key={model.id} value={model.name}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      {selectedModelBySku[row.sku] && selectedModelBySku[row.sku] !== row.bestModel && (
                        <p className="mt-1 text-[11px] text-warning-foreground">
                          Manual override — auto selection was {row.bestModel}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <PrototypeNote>
        Accuracy metrics, backtest curves and runtimes are seeded demonstration values. No model
        fitting, hyperparameter search or training run occurs in this prototype.
      </PrototypeNote>
    </div>
  );
}
