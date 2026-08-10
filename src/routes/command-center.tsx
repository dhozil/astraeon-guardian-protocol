import { createFileRoute } from "@tanstack/react-router";
import { CommandCenterApp } from "@/components/command-center/command-center-app";

export const Route = createFileRoute("/command-center")({
  head: () => ({
    meta: [
      { title: "Astraeon Command Center" },
      {
        name: "description",
        content:
          "Monitor, protect, and empower your autonomous agents. Agent identity, policy engine, risk control, credential gateway, and audit trail.",
      },
    ],
  }),
  component: CommandCenterRoute,
});

function CommandCenterRoute() {
  return <CommandCenterApp />;
}
