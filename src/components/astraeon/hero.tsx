import { ArrowUpRight, BookOpen, Globe, ShieldCheck, CircleCheck, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import guardian from "@/assets/guardian.jpg";
import { CommanderDashboard } from "./commander-dashboard";
import { GhostButton, GoldButton, RialoMark } from "./primitives";

const CAPABILITIES = [
  { icon: RialoMark, title: "Rialo Native", sub: "Confidential Execution / REX" },
  { icon: ShieldCheck, title: "Policy Engine", sub: "Granular Agent Control" },
  { icon: Globe, title: "Real World Access", sub: "APIs, Data, IoT, Payments" },
  { icon: CircleCheck, title: "On-Chain Verification", sub: "Tamperproof & Auditable" },
];

export function Hero() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => setOffset(Math.min(window.scrollY, 700));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="home" className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
      {/* atmosphere */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="star-field absolute inset-0 opacity-60" />
        <div className="absolute top-[-10%] right-[-5%] h-[720px] w-[720px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_65%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-14 px-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:px-10">
        {/* Left */}
        <div className="rise-in">
          <span className="inline-flex items-center gap-2 border border-hairline bg-panel/60 px-3 py-2 text-[0.6rem] tracking-[0.22em] text-foreground/80 uppercase">
            <RialoMark className="h-3 w-3 text-gold" /> Built on Rialo
          </span>

          <h1 className="mt-8 text-4xl leading-[1.08] tracking-[0.02em] uppercase sm:text-5xl lg:text-[3.6rem]">
            Trust Layer for
            <br />
            <span className="gold-text">Autonomous</span> Agents
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Astraeon is the trust &amp; execution infrastructure that empowers AI agents to interact
            with the real world securely, autonomously, and verifiably on Rialo.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <GoldButton href="/command-center">
              Launch App <ArrowUpRight className="h-3.5 w-3.5" />
            </GoldButton>
            <GhostButton href="#developers">
              Documentation <BookOpen className="h-3.5 w-3.5" />
            </GhostButton>
          </div>

          <div className="mt-12 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="panel-hover bg-panel/70 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-gold" />
                  <p className="text-[0.6rem] font-semibold tracking-[0.16em] text-foreground uppercase">
                    {title}
                  </p>
                </div>
                <p className="mt-2 text-[0.65rem] leading-relaxed text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: statue + dashboard */}
        <div className="relative">
          <div className="relative mx-auto h-[460px] w-full max-w-[760px] sm:h-[600px] lg:h-[720px]">
            <div
              aria-hidden="true"
              className="halo-spin absolute top-2 left-[34%] h-[380px] w-[380px] -translate-x-1/2 rounded-full border border-gold/15 sm:h-[480px] sm:w-[480px]"
            >
              <span className="absolute inset-8 rounded-full border border-gold/10" />
              <span className="absolute inset-20 rounded-full border border-gold/10" />
              <span className="absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold/60" />
            </div>

            <div
              className="absolute top-0 bottom-0 -left-[10%] w-[78%] lg:-left-[32%] lg:w-[84%]"
              style={{ transform: `translateY(${offset * -0.05}px)` }}
            >
              <img
                src={guardian}
                alt="Classical marble guardian statue holding a spear, symbol of Astraeon's trust and security layer"
                width={1024}
                height={1408}
                className="h-full w-full object-contain object-top opacity-95 [mask-image:radial-gradient(ellipse_54%_72%_at_64%_42%,black_30%,transparent_88%)]"
              />
            </div>

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(105deg,color-mix(in_oklab,var(--background)_60%,transparent)_0%,transparent_30%,color-mix(in_oklab,var(--background)_45%,transparent)_100%)]"
            />

            <div className="float-slow absolute right-0 bottom-0 w-[92%] max-w-[620px] overflow-x-auto border border-hairline shadow-[var(--shadow-panel)] lg:-right-10">
              <CommanderDashboard />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground lg:hidden">
            <Cpu className="h-3 w-3 text-gold/70" />
            <span className="text-[0.55rem] tracking-[0.2em] uppercase">
              Swipe the panel to explore
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
