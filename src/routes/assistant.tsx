import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { useState } from "react";
import { Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import {
  businessUnits,
  customers,
  filterSkus,
  forecastVersions,
  formatNumber,
  periods,
  plants,
  productFamilies,
  riskRows,
} from "@/lib/demo-data";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Forecasting Assistant — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Ask questions about forecast changes, model selection, accuracy, bias, stockout risk and excess inventory across the current planning scope.",
      },
      { property: "og:title", content: "AI Forecasting Assistant — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Conversational assistant for demand forecasting and inventory questions.",
      },
    ],
  }),
  component: Assistant,
});

const suggestions = [
  "Why did the forecast increase for wiring harnesses?",
  "Which SKUs are at stockout risk this quarter?",
  "Which model was selected for BRK-1180-A and why?",
  "Where do we have persistent forecast bias?",
  "What happens if the OEM schedule drops by 10%?",
  "Summarise what is blocking publication.",
];

function Assistant() {
  const { filters, messages, pushMessage, events, reviewLines } = usePlatform();
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const rows = filterSkus(filters);

  const scopeLabel = [
    businessUnits.find((b) => b.id === filters.bu)?.label,
    customers.find((c) => c.id === filters.customer)?.label,
    productFamilies.find((p) => p.id === filters.family)?.label,
    plants.find((p) => p.id === filters.plant)?.label,
  ]
    .filter(Boolean)
    .join(" · ");

  const answer = (question: string): string => {
    const q = question.toLowerCase();
    const pending = reviewLines.filter((l) => l.status === "Pending").length;
    const stockout = rows.filter((r) => r.stockCoverDays < 15);
    const accepted = events.filter((e) => e.status === "Accepted");

    if (q.includes("stockout") || q.includes("shortage")) {
      const list = (stockout.length ? stockout : rows.slice(0, 3))
        .map((r) => `- ${r.sku} (${r.description}) at ${r.plant}: ${r.stockCoverDays} days cover, lead time ${r.leadTimeDays} days`)
        .join("\n");
      return `**Stockout exposure — ${periods.find((p) => p.id === filters.period)?.label}**\n\n${list}\n\nHighest financial exposure is ${riskRows[0].sku} at ₹${riskRows[0].exposureValue} Cr, driven by: ${riskRows[0].driver.toLowerCase()}.\n\nSuggested actions: expedite open supplier releases, review safety stock on the affected A-class items, and confirm the accepted ramp events with the supply team.`;
    }

    if (q.includes("bias")) {
      return `**Forecast bias review**\n\nHarnesses show the largest positive bias at +6.1%, indicating consistent over-forecasting, while braking assemblies run at -4.2% (under-forecast). Transmission and suspension are within the ±3% tolerance band.\n\nThe harness bias correlates with promotional pull-forward not being reflected in the baseline. Recommended: re-fit the harness combinations with event features enabled and review planner overrides above ±10% in Forecast Review.`;
    }

    if (q.includes("model") || q.includes("why was") || q.includes("selected")) {
      const target = rows[0];
      return `**Model selection for ${target.sku}**\n\nSelected model: ${target.bestModel}\n\nIt was chosen because it produced the lowest holdout error for this combination (MAPE ${target.mape}%, bias ${target.bias > 0 ? "+" : ""}${target.bias}%) across a six-month rolling backtest. Alternatives such as SARIMA fit the seasonal shape but degraded during the schedule change in April 2026.\n\nYou can override the selection per combination in Model Comparison; overrides are recorded in the version audit trail.`;
    }

    if (q.includes("increase") || q.includes("changed") || q.includes("why did")) {
      const relevant = accepted.length ? accepted[0] : events[0];
      return `**Forecast movement explanation**\n\nThe forecast for the current scope moved primarily because of the accepted event "${relevant.title}" (${relevant.expectedImpactPct > 0 ? "+" : ""}${relevant.expectedImpactPct}%, ${relevant.confidence.toLowerCase()} confidence), covering ${relevant.scope} over ${relevant.window}.\n\nStatistical baseline contribution: ${formatNumber(rows.reduce((s, r) => s + r.baseVolume, 0))} units. Event and planner adjustments account for the remainder. Rationale on record: ${relevant.rationale}`;
    }

    if (q.includes("what if") || q.includes("what happens") || q.includes("scenario") || q.includes("drop")) {
      return `**Scenario indication**\n\nA 10% reduction in OEM release quantities for this scope would reduce horizon demand by roughly ${formatNumber(Math.round(rows.reduce((s, r) => s + r.baseVolume, 0) * 0.1))} units, push six combinations above 60 days of cover, and create approximately ₹2.1 Cr of excess-inventory exposure concentrated in transmission components.\n\nOpen What-if Scenarios to model this with capacity and lead-time drivers, then save it as a named scenario. The official forecast is not affected.`;
    }

    if (q.includes("publish") || q.includes("blocking") || q.includes("approval")) {
      return `**Publication readiness**\n\n- ${pending} review line(s) awaiting approval\n- 1 blocking data issue: promotion log missing Q3 2026 campaign rows\n- ${events.filter((e) => e.status !== "Accepted" && e.status !== "Rejected").length} business event(s) awaiting a decision\n\nOnce the review lines are approved and the promotion log is loaded, version V2026.07 can be published to downstream planning systems.`;
    }

    if (q.includes("accuracy")) {
      const weighted =
        rows.reduce((s, r) => s + r.mape * r.baseVolume, 0) / (rows.reduce((s, r) => s + r.baseVolume, 0) || 1);
      return `**Accuracy for the current scope**\n\nWeighted accuracy is ${(100 - weighted).toFixed(1)}% (MAPE ${weighted.toFixed(1)}%) across ${rows.length} SKU groupings. Accuracy has improved for five consecutive cycles, mainly from the move to gradient boosted trees on high-volume OEM combinations.\n\nWeakest performers are the intermittent spare-part items, where Croston-style models remain around 18% MAPE.`;
    }

    return `I can answer questions about forecast movements, model selection, accuracy and bias, stockout and excess-inventory risk, scenario outcomes and publication readiness.\n\nCurrent scope: ${scopeLabel} · ${periods.find((p) => p.id === filters.period)?.label} · ${forecastVersions.find((v) => v.id === filters.version)?.label}. Try one of the suggested questions below.`;
  };

  const send = (question: string) => {
    const text = question.trim();
    if (!text) return;
    pushMessage({ id: `u-${Date.now()}`, role: "user", content: text });
    setInput("");
    setThinking(true);
    setTimeout(() => {
      pushMessage({ id: `a-${Date.now()}`, role: "assistant", content: answer(text) });
      setThinking(false);
    }, 650);
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="AI Forecasting Assistant"
        subtitle="Ask questions in plain language about the forecast, its drivers, its accuracy and its inventory consequences. Answers are grounded in the current filter scope."
        actions={<StatusPill tone="info"><Sparkles className="h-3 w-3" aria-hidden /> Simulated responses</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          title="Conversation"
          description={`Scope: ${scopeLabel} · ${forecastVersions.find((v) => v.id === filters.version)?.label}`}
          bodyClassName="p-0"
        >
          <div className="max-h-[26rem] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                    message.role === "assistant" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.role === "assistant" ? <Bot className="h-4 w-4" aria-hidden /> : <User className="h-4 w-4" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="label-caps">{message.role === "assistant" ? "Forecasting assistant" : "You"}</p>
                  <div className="mt-1 space-y-1.5 text-sm leading-relaxed">
                    {message.content.split("\n").map((line, index) => {
                      if (!line.trim()) return null;
                      const bold = line.startsWith("**") && line.endsWith("**");
                      return (
                        <p
                          key={index}
                          className={cn(
                            bold && "font-semibold",
                            line.startsWith("- ") && "num pl-3 text-xs text-muted-foreground",
                          )}
                        >
                          {bold ? line.replaceAll("**", "") : line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            {thinking && (
              <p className="pl-10 text-xs text-muted-foreground">Reviewing forecast version and risk data…</p>
            )}
          </div>
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={2}
                placeholder="Ask about forecast changes, accuracy, bias, stockout risk or scenarios…"
                className="min-w-0 flex-1 resize-none rounded-md border border-input bg-surface px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
              />
              <button
                type="button"
                onClick={() => send(input)}
                disabled={!input.trim() || thinking}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" aria-hidden /> Ask
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Suggested questions">
            <ul className="space-y-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => send(suggestion)}
                    className="w-full rounded-md border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="What the assistant can see">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Current global filter selection and forecast version</li>
              <li>• Statistical baseline and planner overrides</li>
              <li>• Accepted and pending business events</li>
              <li>• Model selection and holdout accuracy metrics</li>
              <li>• Inventory cover, stockout and excess exposure</li>
              <li>• Review status and audit trail entries</li>
            </ul>
          </Panel>
        </div>
      </div>

      <PrototypeNote>
        Assistant responses are generated locally from seeded demonstration data using deterministic
        rules. No language model is called and no customer data is processed.
      </PrototypeNote>
    </div>
  );
}
