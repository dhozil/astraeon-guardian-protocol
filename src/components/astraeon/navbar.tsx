import { ArrowUpRight, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { TempleMark } from "./primitives";

const NAV = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Developers", href: "#developers" },
  { label: "Docs", href: "#developers" },
  { label: "Roadmap", href: "#rialo" },
  { label: "Blog", href: "#rialo" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500 ${
        scrolled
          ? "border-hairline bg-background/85 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-10">
        <a href="#home" className="flex items-center gap-3">
          <TempleMark className="h-8 w-8" />
          <span className="leading-none">
            <span className="block font-display text-lg tracking-[0.24em] text-foreground">
              ASTRAEON
            </span>
            <span className="mt-1 block text-[0.5rem] tracking-[0.32em] text-gold/70 uppercase">
              Trust. Execute. Empower.
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 xl:flex">
          {NAV.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              className="group relative py-2 text-[0.68rem] font-medium tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              {item.label}
              <span
                className={`absolute -bottom-1 left-0 h-px bg-gold transition-all duration-300 ${
                  i === 0 ? "w-full" : "w-0 group-hover:w-full"
                }`}
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/command-center"
            className="hidden items-center gap-2 border border-gold/50 px-5 py-2.5 text-[0.65rem] font-semibold tracking-[0.2em] text-gold uppercase transition-colors hover:bg-gold/10 sm:inline-flex"
          >
            Launch App <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setOpen((v) => !v)}
            className="border border-hairline p-2.5 text-muted-foreground xl:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-hairline bg-background/95 px-5 py-4 xl:hidden">
          <div className="grid grid-cols-2 gap-y-3">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
