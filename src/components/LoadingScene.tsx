import { useEffect, useState } from "react";

const STATUS_LINES = [
  "Reading the fog for a way out…",
  "Counting your salt…",
  "Listening for footsteps behind you…",
  "The town is deciding what you deserve…",
  "Burning a little more lantern oil…",
  "Asking the exit if it is still there…",
  "Waking something that was sleeping…",
];

function Lantern() {
  return (
    <div className="relative h-28 w-20 shrink-0" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-24 w-24 rounded-full border border-ecto/40 animate-ring" />
      <div
        className="absolute left-1/2 top-1/2 h-24 w-24 rounded-full border border-primary/40 animate-ring"
        style={{ animationDelay: "-1.1s" }}
      />

      <div className="absolute left-1/2 top-0 h-5 w-10 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-primary/70" />

      <div className="absolute left-1/2 top-4 h-20 w-16 -translate-x-1/2 rounded-md border-2 border-primary/70 bg-background/70">
        <div className="absolute inset-1 rounded-sm bg-gradient-to-b from-primary/15 to-transparent" />
        <div
          className="absolute bottom-3 left-1/2 h-8 w-4 rounded-full bg-gradient-to-t from-primary via-accent to-ecto blur-[1px] animate-flame"
          style={{ boxShadow: "0 0 22px oklch(0.7 0.19 50 / 0.8)" }}
        />
        <div className="absolute -bottom-1 left-1/2 h-2 w-12 -translate-x-1/2 rounded-sm bg-primary/60" />
      </div>

      {[0, 1, 2].map((n) => (
        <span
          key={n}
          className="absolute bottom-24 left-1/2 h-1.5 w-1.5 rounded-full bg-ecto animate-spirit"
          style={{ animationDelay: `${n * 0.85}s`, marginLeft: `${(n - 1) * 11}px` }}
        />
      ))}
    </div>
  );
}

export function LoadingScene({
  label = "The Ghost Protocol is writing your next scene",
}: {
  label?: string;
}) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setLine((n) => (n + 1) % STATUS_LINES.length), 1900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-md border border-ecto/40 bg-card/90 p-6 backdrop-blur glow-ecto"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-10 top-4 h-16 w-56 rounded-full bg-ecto/10 blur-2xl animate-wisp" />
        <div
          className="absolute -right-8 bottom-2 h-20 w-72 rounded-full bg-primary/10 blur-3xl animate-wisp"
          style={{ animationDelay: "-4.5s" }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        <Lantern />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="font-display text-2xl text-primary text-glow">{label}</p>
          <p key={line} className="mt-1 text-sm text-ecto animate-line-in">
            {STATUS_LINES[line]}
          </p>
          <div className="mt-5 flex justify-center gap-2 sm:justify-start" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, n) => (
              <span key={n} className="h-1.5 w-8 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full w-1/2 rounded-full bg-ecto animate-sweep"
                  style={{ animationDelay: `${n * 0.16}s` }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
