import { createFileRoute } from "@tanstack/react-router";
import { Bot, Quote, Send, ShieldCheck, User } from "lucide-react";
import { useRef, useState } from "react";
import { Panel, PageHeading, PrototypeNote, StatusPill } from "@/components/primitives";
import { businessUnits, customers, plants, productFamilies } from "@/lib/demo-data";
import {
  answerQuestion,
  assistantGuardrails,
  assistantIntents,
  insufficientEvidence,
  type AssistantEvidence,
} from "@/lib/governance-domain";
import { usePlatform } from "@/lib/platform-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Forecasting Assistant — Demand Intelligence Platform" },
      {
        name: "description",
        content:
          "Ask about forecast movements, model selection, bias, stockout risk and publication blockers. Every answer cites its evidence and returns “Insufficient evidence” when no record exists.",
      },
      { property: "og:title", content: "AI Forecasting Assistant — Demand Intelligence Platform" },
      {
        property: "og:description",
        content: "Evidence-cited conversational assistant for demand planning decisions.",
      },
    ],
  }),
  component: Assistant,
});

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: AssistantEvidence[];
};

const seedTurns: Turn[] = [
  {
    id: "t-0",
    role: "assistant",
    content:
      "I answer questions about the current forecast cycle using the platform's own records: certified data, model runs, qualified events, the approval queue and published versions.\n\nI cannot approve, reject, publish or change anything, and I will say **Insufficient evidence** rather than infer a number that has no source.",
  },
];

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

function Assistant() {
  const { filters } = usePlatform();
  const [turns, setTurns] = useState<Turn[]>(seedTurns);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const counter = useRef(0);

  const scopeLabel = [
    businessUnits.find((b) => b.id === filters.bu)?.label,
    customers.find((c) => c.id === filters.customer)?.label,
    productFamilies.find((p) => p.id === filters.family)?.label,
    plants.find((p) => p.id === filters.plant)?.label,
  ]
    .filter(Boolean)
    .join(" · ");

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || thinking) return;
    counter.current += 1;
    const userTurn: Turn = { id: `u-${counter.current}`, role: "user", content: text };
    setTurns((prev) => [...prev, userTurn]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      const intent = answerQuestion(text);
      counter.current += 1;
      setTurns((prev) => [
        ...prev,
        intent
          ? { id: `a-${counter.current}`, role: "assistant", content: intent.answer, evidence: intent.evidence }
          : { id: `a-${counter.current}`, role: "assistant", content: insufficientEvidence },
      ]);
      setThinking(false);
    }, 550);
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="AI Forecasting Assistant"
        subtitle="A decision-support assistant grounded in the platform's own records. Answers are traceable: each one cites the screen and record it came from, and the assistant never presents a scenario as an approved operational forecast."
        actions={<StatusPill tone="info">Scope: {scopeLabel || "All"}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Conversation" description="Answers are generated from seeded prototype records only." bodyClassName="p-0">
          <div className="flex max-h-[560px] min-h-[380px] flex-col gap-4 overflow-y-auto p-4 sm:p-5">
            {turns.map((turn) => (
              <div key={turn.id} className={cn("flex gap-3", turn.role === "user" && "justify-end")}>
                {turn.role === "assistant" && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </span>
                )}
                <div className={cn("min-w-0 max-w-[46rem]", turn.role === "user" && "text-right")}>
                  <div
                    className={cn(
                      turn.role === "user"
                        ? "inline-block rounded-lg bg-primary px-3 py-2 text-left text-sm text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {turn.role === "user" ? turn.content : renderMarkdown(turn.content)}
                  </div>
                  {turn.evidence && turn.evidence.length > 0 && (
                    <div className="mt-2 rounded-md border border-border bg-surface-muted px-3 py-2">
                      <p className="label-caps flex items-center gap-1.5">
                        <Quote className="h-3 w-3" aria-hidden /> Evidence cited
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {turn.evidence.map((ev) => (
                          <li key={ev.label} className="text-xs">
                            <span className="font-medium">{ev.label}</span>
                            <span className="text-muted-foreground"> — {ev.source} · {ev.reference}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {turn.role === "user" && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted">
                    <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </span>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="h-3.5 w-3.5" aria-hidden /> Checking certified records…
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex gap-2 border-t border-border p-3 sm:p-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a forecast movement, model choice, bias, risk or publication status…"
              className="flex-1 rounded-md border border-input bg-surface px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden /> Ask
            </button>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel title="Suggested questions" description="Questions the assistant holds evidence for.">
            <ul className="space-y-2">
              {assistantIntents.map((intent) => (
                <li key={intent.id}>
                  <button
                    type="button"
                    onClick={() => ask(intent.question)}
                    className="w-full rounded-md border border-input px-3 py-2 text-left text-xs hover:bg-accent"
                  >
                    {intent.question}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Guardrails" description="Constraints applied to every answer.">
            <ul className="space-y-2">
              {assistantGuardrails.map((rule) => (
                <li key={rule} className="flex items-start gap-2 text-xs">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" aria-hidden />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <PrototypeNote>
        Illustrative prototype data. No language model is called: responses are matched against a fixed
        set of evidenced answers, and anything outside that set returns “Insufficient evidence”.
      </PrototypeNote>
    </div>
  );
}
