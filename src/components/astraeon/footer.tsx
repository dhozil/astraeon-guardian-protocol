import { TempleMark } from "./primitives";

const LINKS = [
  { label: "Protocol", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Developers", href: "#developers" },
  { label: "Documentation", href: "#developers" },
  { label: "GitHub", href: "#developers" },
  { label: "Blog", href: "#rialo" },
  { label: "Roadmap", href: "#rialo" },
];

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-background/80">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-5 py-14 lg:flex-row lg:items-start lg:justify-between lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <TempleMark className="h-7 w-7" />
            <span className="font-display text-base tracking-[0.24em]">ASTRAEON</span>
          </div>
          <p className="mt-3 text-[0.55rem] tracking-[0.3em] text-gold/70 uppercase">
            Trust. Execute. Empower.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-12 gap-y-3 sm:grid-cols-4 lg:grid-cols-4">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-gold"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-5 py-6 text-[0.6rem] tracking-[0.14em] text-muted-foreground/70 uppercase sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>© 2026 Astraeon. Trust infrastructure for autonomous agents.</p>
          <p className="text-gold/60">Built on Rialo.</p>
        </div>
      </div>
    </footer>
  );
}
