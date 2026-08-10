import { ArrowUpRight } from "lucide-react";
import marble from "@/assets/marble-cta.jpg";
import { GhostButton, GoldButton } from "./primitives";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-hairline py-28 lg:py-40">
      <img
        src={marble}
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1536}
        height={768}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--background),transparent_35%,var(--background))]"
      />

      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <div className="rule-gold mx-auto w-32" />
        <h2 className="mt-8 text-3xl leading-[1.15] tracking-[0.04em] uppercase sm:text-4xl lg:text-[3rem]">
          The Autonomous Economy
          <br />
          Needs <span className="gold-text">Trust.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Give intelligent systems the power to act — without giving them unlimited power.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <GoldButton href="#command-center">
            Launch Astraeon <ArrowUpRight className="h-3.5 w-3.5" />
          </GoldButton>
          <GhostButton href="#developers">View Documentation</GhostButton>
        </div>
      </div>
    </section>
  );
}
