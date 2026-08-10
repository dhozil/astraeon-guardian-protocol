import { SectionHeading, TempleMark } from "./primitives";

const SYSTEMS = ["APIs", "Web2", "Payments", "DeFi", "IoT", "RWA", "External Data", "Other Agents"];

export function RealWorld() {
  const radius = 168;
  return (
    <section className="relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-16 px-5 lg:grid-cols-2 lg:px-10">
        <SectionHeading
          label="Real World"
          title={
            <>
              From Digital Intelligence
              <br />
              to Real-World Action.
            </>
          }
          description="Astraeon brokers every outbound request an agent makes — signing, scoping, and recording it — so intelligence can reach production systems without becoming a liability."
        />

        <div className="relative mx-auto aspect-square w-full max-w-[440px]">
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
            <circle cx="200" cy="200" r="120" fill="none" stroke="var(--hairline)" />
            <circle cx="200" cy="200" r="168" fill="none" stroke="var(--hairline)" />
            {SYSTEMS.map((_, i) => {
              const a = (i / SYSTEMS.length) * Math.PI * 2 - Math.PI / 2;
              const x = 200 + Math.cos(a) * radius;
              const y = 200 + Math.sin(a) * radius;
              return (
                <g key={i}>
                  <line
                    x1="200"
                    y1="200"
                    x2={x}
                    y2={y}
                    stroke="color-mix(in oklab, var(--gold) 30%, transparent)"
                    strokeWidth="0.7"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="3"
                    fill="var(--gold)"
                    opacity="0.8"
                    style={{ animation: `astra-pulse ${3 + i * 0.4}s ease-in-out infinite` }}
                  />
                </g>
              );
            })}
          </svg>

          <div className="absolute top-1/2 left-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border border-gold/45 bg-background/90">
            <TempleMark className="h-6 w-6" />
            <span className="mt-2 font-display text-[0.5rem] tracking-[0.2em] text-gold">
              ASTRAEON
            </span>
          </div>

          {SYSTEMS.map((s, i) => {
            const a = (i / SYSTEMS.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + (Math.cos(a) * radius * 100) / 400;
            const y = 50 + (Math.sin(a) * radius * 100) / 400;
            return (
              <span
                key={s}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 translate-y-4 text-[0.55rem] tracking-[0.2em] whitespace-nowrap text-muted-foreground uppercase"
              >
                {s}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
