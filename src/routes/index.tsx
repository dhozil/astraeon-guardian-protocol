import { createFileRoute } from "@tanstack/react-router";
import { Architecture } from "@/components/astraeon/architecture";
import { CommandCenter } from "@/components/astraeon/command-center";
import { Developers } from "@/components/astraeon/developers";
import { Features } from "@/components/astraeon/features";
import { FinalCta } from "@/components/astraeon/final-cta";
import { Footer } from "@/components/astraeon/footer";
import { Hero } from "@/components/astraeon/hero";
import { Navbar } from "@/components/astraeon/navbar";
import { PolicyEngine } from "@/components/astraeon/policy-engine";
import { RealWorld } from "@/components/astraeon/real-world";
import { RialoSection } from "@/components/astraeon/rialo-section";
import { SecurityDemo } from "@/components/astraeon/security-demo";
import { TrustStrip } from "@/components/astraeon/trust-strip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Astraeon — Trust Layer for Autonomous Agents" },
      {
        name: "description",
        content:
          "Astraeon is the trust, policy and execution infrastructure that lets AI agents act in the real world securely, autonomously, and verifiably on Rialo.",
      },
      { property: "og:title", content: "Astraeon — Trust Layer for Autonomous Agents" },
      {
        property: "og:description",
        content:
          "Programmable trust for the agent economy: agent identity, policy engine, risk controls, credential gateway, and on-chain audit trails.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Architecture />
        <Features />
        <SecurityDemo />
        <PolicyEngine />
        <CommandCenter />
        <RealWorld />
        <RialoSection />
        <Developers />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
