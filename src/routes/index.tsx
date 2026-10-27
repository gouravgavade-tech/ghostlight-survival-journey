import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { playTurn, type Turn } from "@/lib/game.functions";
import fogTown from "@/assets/fog-town.jpg";
import { LoadingScene } from "@/components/LoadingScene";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ghost Protocol — The Last Safe Exit" },
      { name: "description", content: "An AI Halloween survival game: manage supplies, read clues, and choose routes to escape a haunted town." },
      { property: "og:title", content: "Ghost Protocol — The Last Safe Exit" },
      { property: "og:description", content: "Every choice changes the night. Can you reach the last safe exit?" },
    ],
  }),
  component: Game,
});

type Supplies = { light: number; food: number; salt: number; sanity: number };
const START: Supplies = { light: 10, food: 10, salt: 10, sanity: 10 };
const clamp = (n: number) => Math.max(0, Math.min(15, Math.round(n)));

function Meter({ label, value, max = 15, tone = "primary" }: { label: string; value: number; max?: number; tone?: "primary" | "ecto" | "destructive" }) {
  const bar = tone === "ecto" ? "bg-ecto" : tone === "destructive" ? "bg-destructive" : "bg-primary";
  return (
    <div>
      <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-sm bg-muted">
        <div className={`h-full ${bar} transition-all duration-700`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function Game() {
  const play = useServerFn(playTurn);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [supplies, setSupplies] = useState<Supplies>(START);
  const [history, setHistory] = useState<{ scene: string; choice: string }[]>([]);
  const [clueLog, setClueLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function advance(choiceLabel: string | null, cost?: { light: number; food: number; salt: number }) {
    setLoading(true);
    setError(null);
    let s = supplies;
    let h = history;
    if (choiceLabel && turn && cost) {
      s = { ...s, light: clamp(s.light - cost.light), food: clamp(s.food - cost.food), salt: clamp(s.salt - cost.salt) };
      h = [...history, { scene: turn.scene, choice: choiceLabel }];
    }
    try {
      const next = await play({ data: { history: h.slice(-12), supplies: s, distanceToExit: turn?.distanceToExit ?? 100, lastChoice: choiceLabel } });
      const d = next.supplyDelta;
      const ns = { light: clamp(s.light + d.light), food: clamp(s.food + d.food), salt: clamp(s.salt + d.salt), sanity: clamp(s.sanity + d.sanity) };
      setSupplies(ns);
      setHistory(h);
      setClueLog((c) => [...next.clues, ...c].slice(0, 12));
      const dead = ns.light === 0 || ns.sanity === 0;
      setTurn(dead && next.status === "ongoing" ? { ...next, status: "lost", choices: [] } : next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTurn(null);
    setSupplies(START);
    setHistory([]);
    setClueLog([]);
  }

  const canAfford = (c: { light: number; food: number; salt: number }) => supplies.light >= c.light && supplies.food >= c.food && supplies.salt >= c.salt;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <img src={fogTown} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <header className="text-center">
          <h1 className="animate-flicker font-display text-6xl text-primary text-glow md:text-8xl">Ghost Protocol</h1>
          <p className="mt-2 text-lg tracking-[0.3em] text-ecto uppercase">The Last Safe Exit</p>
        </header>

        {!turn && (
          <section className="mx-auto mt-16 max-w-xl rounded-md border bg-card p-8 text-center backdrop-blur">
            <p className="leading-relaxed text-muted-foreground">
              It's Halloween night. The fog has swallowed Hollow Creek. Your lantern, your salt, your food and your nerve are all you have. The AI watches every move — and the town remembers.
            </p>
            <button onClick={() => advance(null)} disabled={loading} className="mt-8 rounded-md bg-primary px-8 py-3 font-display text-2xl text-primary-foreground glow-primary transition hover:scale-105 disabled:opacity-60">
              {loading ? "Summoning..." : "Enter the fog"}
            </button>
            {loading && (
              <div className="mt-8 text-left">
                <LoadingScene label="Opening the fog…" />
              </div>
            )}
            {error && <p className="mt-4 text-destructive">{error}</p>}
          </section>
        )}

        {turn && (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]">
            <section className="space-y-5">
              {turn.consequence && (
                <div className="rounded-md border border-primary/50 bg-card p-5 backdrop-blur">
                  <h2 className="text-xs uppercase tracking-widest text-primary">Consequence</h2>
                  <p className="mt-2 leading-relaxed">{turn.consequence}</p>
                </div>
              )}
              {turn.environmentShift && (
                <div className="rounded-md border border-ecto/40 bg-card p-5 backdrop-blur glow-ecto">
                  <h2 className="text-xs uppercase tracking-widest text-ecto">The town reacts</h2>
                  <p className="mt-2 leading-relaxed">{turn.environmentShift}</p>
                </div>
              )}
              <div className="rounded-md border bg-card p-6 backdrop-blur">
                <p className="text-lg leading-relaxed">{turn.scene}</p>
              </div>

              {turn.status === "ongoing" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {turn.choices.map((c) => {
                    const ok = canAfford(c.cost);
                    return (
                      <button key={c.id} disabled={loading || !ok} onClick={() => advance(c.label, c.cost)} className="group rounded-md border bg-secondary/80 p-4 text-left transition hover:border-primary hover:glow-primary disabled:opacity-40 disabled:hover:border-border">
                        <div className="font-display text-xl text-primary">{c.label}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{c.detail}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className={c.risk === "high" ? "text-destructive" : c.risk === "medium" ? "text-primary" : "text-ecto"}>Risk: {c.risk}</span>
                          <span className="text-muted-foreground">🕯 {c.cost.light} · 🍞 {c.cost.food} · 🧂 {c.cost.salt}</span>
                        </div>
                        {!ok && <p className="mt-2 text-xs text-destructive">Not enough supplies</p>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border bg-card p-8 text-center backdrop-blur">
                  <p className={`font-display text-5xl ${turn.status === "escaped" ? "text-ecto" : "text-destructive"}`}>
                    {turn.status === "escaped" ? "You escaped" : "The fog took you"}
                  </p>
                  <p className="mt-2 text-muted-foreground">Survived {history.length + 1} decisions.</p>
                  <button onClick={reset} className="mt-6 rounded-md bg-primary px-6 py-2 font-display text-xl text-primary-foreground glow-primary">Play again</button>
                </div>
              )}
              {loading && <LoadingScene />}
              {error && <p className="text-center text-destructive">{error}</p>}
            </section>

            <aside className="space-y-5">
              <div className="space-y-3 rounded-md border bg-card p-5 backdrop-blur">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Supplies</h2>
                <Meter label="🕯 Lantern oil" value={supplies.light} />
                <Meter label="🍞 Food" value={supplies.food} />
                <Meter label="🧂 Salt" value={supplies.salt} tone="ecto" />
                <Meter label="🧠 Sanity" value={supplies.sanity} tone="ecto" />
              </div>
              <div className="space-y-3 rounded-md border bg-card p-5 backdrop-blur">
                <Meter label="Danger" value={turn.dangerLevel} max={100} tone="destructive" />
                <Meter label="Distance to exit" value={turn.distanceToExit} max={100} />
              </div>
              <div className="rounded-md border bg-card p-5 backdrop-blur">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Clue journal</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {clueLog.map((c, i) => (
                    <li key={i} className={i < turn.clues.length ? "text-ecto" : "text-muted-foreground"}>› {c}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
