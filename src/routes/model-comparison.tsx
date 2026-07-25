import { createFileRoute } from "@tanstack/react-router";
import { CheckCheck, Cpu, GitCompareArrows, ScrollText, Shapes, Trophy } from "lucide-react";
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
import { filterSkus, models } from "@/lib/demo-data";
import {
  behaviourClasses,
  candidateModels,
  championModelId,
  isEligible,
  rollingBacktest,
  selectionPolicy,
} from "@/lib/forecast-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/model-comparison")({
  head: () => ({
    meta: [
      { title: "Model Comparison — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Compare seasonal naïve, ARIMA, Prophet, Croston, XGBoost and foundation-model candidates on WAPE, MASE, sMAPE, bias and stability before selecting a champion.",
      },
      { property: "og:title", content: "Model Comparison — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Candidate model metrics, selection policy and demand-behaviour classification.",
      },
    ],
  }),
  component: ModelComparison,
});

function ModelComparison() {
  const { filters, selectedModelBySku, setSelectedModel } = usePlatform();
  const rows = filterSkus(filters);
  const [selectedId, setSelectedId] = useState(championModelId);
  const [behaviourFilter, setBehaviourFilter] = useState<string | null>(null);
  const selected = candidateModels.find((m) => m.id === selectedId)!;
  const eligibleCount = candidateModels.filter(isEligible).length;

  const filteredModels = behaviourFilter
    ? candidateModels.filter((m) => {
        const behaviour = behaviourClasses.find((b) => b.id === behaviourFilter);
        if (!behaviour) return true;
        return behaviour.recommended
          .toLowerCase()
          .split(/[\/\s]+/)
          .some((token) => token.length > 2 && m.name.toLowerCase().includes(token));
      })
    : candidateModels;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Model Comparison"
        subtitle="Evaluate the candidate model library on rolling-origin backtests, apply the selection policy, and confirm the model used for each SKU, customer and location combination."
        actions={
          <StatusPill tone="info">
            <Cpu className="h-3 w-3" aria-hidden /> {candidateModels.length} candidates · 1,284 combinations scored
          </StatusPill>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Champion model" value={selected.name.split(" ")[0]} delta={selected.family} deltaTone="info" icon={Trophy} />
        <KpiTile label="Champion WAPE" value={selected.wape.toFixed(1)} unit="%" delta={`MASE ${selected.mase.toFixed(2)} · sMAPE ${selected.smape.toFixed(1)}%`} deltaTone="positive" icon={GitCompareArrows} />
        <KpiTile
          label="Champion bias"
          value={`${selected.bias > 0 ? "+" : ""}${selected.bias.toFixed(1)}%`}
          delta={Math.abs(selected.bias) <= 2 ? "Inside ±2% gate" : "Outside bias gate"}
          deltaTone={Math.abs(selected.bias) <= 2 ? "positive" : "warning"}
          icon={CheckCheck}
        />
        <KpiTile label="Models passing all gates" value={String(eligibleCount)} unit={`/ ${candidateModels.length}`} delta="MASE, bias and stability gates" deltaTone="neutral" icon={Cpu} />
      </div>

      <Panel
        title="Candidate model library"
        description="Ranked by volume-weighted absolute percentage error on rolling-origin backtests. A model must clear every gate to be selectable."
        bodyClassName="p-0"
        actions={
          behaviourFilter ? (
            <button
              type="button"
              onClick={() => setBehaviourFilter(null)}
              className="rounded-md border border-input px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              Clear behaviour filter
            </button>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Model</th>
                <th className="label-caps px-4 py-2.5">Type</th>
                <th className="label-caps px-4 py-2.5 text-right">WAPE</th>
                <th className="label-caps px-4 py-2.5 text-right">MASE</th>
                <th className="label-caps px-4 py-2.5 text-right">sMAPE</th>
                <th className="label-caps px-4 py-2.5 text-right">Bias</th>
                <th className="label-caps px-4 py-2.5 text-right">Stability</th>
                <th className="label-caps px-4 py-2.5">Status</th>
                <th className="label-caps px-4 py-2.5">Eligibility</th>
                <th className="label-caps px-4 py-2.5">Best suited to</th>
                <th className="label-caps px-4 py-2.5 text-right">Champion</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((model) => {
                const eligible = isEligible(model);
                return (
                  <tr
                    key={model.id}
                    className={cn(
                      "border-b border-border last:border-0 align-top",
                      selectedId === model.id ? "bg-accent/60" : "hover:bg-surface-muted/60",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-semibold text-foreground">{model.name}</p>
                      <p className="text-xs text-muted-foreground">{model.rationale}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{model.family}</td>
                    <td className="num px-4 py-2.5 text-right text-xs font-semibold">{model.wape.toFixed(1)}%</td>
                    <td className="num px-4 py-2.5 text-right text-xs">
                      <span className={model.mase < 1 ? "text-positive" : "text-risk"}>{model.mase.toFixed(2)}</span>
                    </td>
                    <td className="num px-4 py-2.5 text-right text-xs">{model.smape.toFixed(1)}%</td>
                    <td className="num px-4 py-2.5 text-right text-xs">
                      <span className={Math.abs(model.bias) > 4 ? "text-risk" : Math.abs(model.bias) > 2 ? "text-warning-foreground" : "text-positive"}>
                        {model.bias > 0 ? "+" : ""}
                        {model.bias.toFixed(1)}%
                      </span>
                    </td>
                    <td className="num px-4 py-2.5 text-right text-xs">{model.stability}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill
                        tone={
                          model.training === "Trained"
                            ? "positive"
                            : model.training === "Training"
                              ? "warning"
                              : model.training === "Failed"
                                ? "risk"
                                : "neutral"
                        }
                      >
                        {model.training}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill tone={eligible ? "positive" : "warning"}>
                        {eligible ? "Passes all gates" : "Gated"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{model.bestFor}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedId(model.id)}
                        disabled={!eligible}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                          selectedId === model.id
                            ? "bg-primary text-primary-foreground"
                            : "border border-input hover:bg-accent",
                        )}
                      >
                        {selectedId === model.id ? "Selected" : "Set champion"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Rolling-origin backtest by fold"
          description="WAPE per fold. Consistency across folds matters as much as the average error."
        >
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingBacktest} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="fold" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-neutral-line)" width={36} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 12 }} formatter={(v: number | string) => `${v}%`} />
                <Line type="monotone" dataKey="xgboost" name="XGBoost" stroke="var(--color-primary)" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="lightgbm" name="LightGBM" stroke="var(--color-accent-blue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="foundation" name="Foundation model" stroke="var(--color-positive)" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="sarima" name="SARIMA" stroke="var(--color-warning)" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="croston" name="Croston / SBA" stroke="var(--color-risk)" strokeWidth={1.6} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            {[
              ["XGBoost", "bg-primary"],
              ["LightGBM", "bg-accent-blue"],
              ["Foundation model", "bg-positive"],
              ["SARIMA", "bg-warning"],
              ["Croston / SBA", "bg-risk"],
            ].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", color)} /> {label}
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          title="Selection policy"
          description="Applied automatically to every combination."
          actions={<ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden />}
        >
          <ol className="space-y-2 text-xs text-muted-foreground">
            {selectionPolicy.map((rule, index) => (
              <li key={rule} className="flex gap-2">
                <span className="num mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                  {index + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel
        title="Demand-behaviour classification"
        description="Every series is classified before model selection; the classification restricts the eligible model set. Select a class to filter the library."
        bodyClassName="p-0"
        actions={<Shapes className="h-4 w-4 text-muted-foreground" aria-hidden />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left">
                <th className="label-caps px-4 py-2.5">Behaviour class</th>
                <th className="label-caps px-4 py-2.5 text-right">Series</th>
                <th className="label-caps px-4 py-2.5 text-right">Share</th>
                <th className="label-caps px-4 py-2.5">Statistical signature</th>
                <th className="label-caps px-4 py-2.5">Recommended models</th>
              </tr>
            </thead>
            <tbody>
              {behaviourClasses.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setBehaviourFilter(behaviourFilter === row.id ? null : row.id)}
                  className={cn(
                    "cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/60",
                    behaviourFilter === row.id && "bg-accent",
                  )}
                >
                  <td className="px-4 py-2.5 text-xs font-semibold">{row.name}</td>
                  <td className="num px-4 py-2.5 text-right text-xs">{row.seriesCount}</td>
                  <td className="num px-4 py-2.5 text-right text-xs text-muted-foreground">{row.seriesShare}%</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.signature}</td>
                  <td className="px-4 py-2.5 text-xs">{row.recommended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Model selection by combination"
        description="Override the automatic selection where planners have a documented reason."
        bodyClassName="p-0"
      >
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-surface-muted">
              <tr className="border-b border-border text-left">
                <th className="label-caps px-4 py-2.5">Combination</th>
                <th className="label-caps px-4 py-2.5">Behaviour</th>
                <th className="label-caps px-4 py-2.5">Selected model</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.sku} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <p className="num text-xs font-semibold">{row.sku}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.customer}</p>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {behaviourClasses[index % behaviourClasses.length].name}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={selectedModelBySku[row.sku] ?? row.bestModel}
                      onChange={(event) => setSelectedModel(row.sku, event.target.value)}
                      className="h-7 w-full rounded-md border border-input bg-surface px-2 text-xs focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                    >
                      {[...new Set([row.bestModel, ...candidateModels.map((m) => m.name), ...models.map((m) => m.name)])].map(
                        (name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ),
                      )}
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

      <PrototypeNote>
        Illustrative prototype data. Accuracy metrics, backtest folds and behaviour shares are seeded
        demonstration values; no model fitting or hyperparameter search occurs.
      </PrototypeNote>
    </div>
  );
}
