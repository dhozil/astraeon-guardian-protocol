import { useState } from "react";
import { TempleMark } from "@/components/astraeon/primitives";
import { OPERATOR_PASSCODE, useAstraeon } from "@/lib/astraeon/store";
import { GoldSolidButton, Input, Panel, Pill } from "./bits";

export function OperatorGate() {
  const { unlockOperator, connection } = useAstraeon();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (unlockOperator(code)) {
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <TempleMark className="mx-auto h-10 w-10" />
          <h2 className="mt-4 font-display text-2xl tracking-[0.1em] text-foreground uppercase">
            Operator Authorization
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[0.7rem] leading-relaxed text-muted-foreground">
            The command console is locked. Destructive operations — on-chain execution, approvals,
            agent pause/revoke, funding — require the operator passcode. Astraeon holds no keys;
            this gate protects the operator's console.
          </p>
        </div>

        <Panel>
          <form
            className="space-y-4 px-6 py-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="block">
              <span className="label-micro">Operator Passcode</span>
              <Input
                value={code}
                onChange={setCode}
                type="password"
                placeholder="••••••••"
                className="mt-2"
              />
            </label>
            {error ? (
              <p className="text-[0.65rem] text-crimson">Incorrect passcode. Try again.</p>
            ) : null}
            <GoldSolidButton onClick={submit} className="w-full justify-center">
              Unlock Console
            </GoldSolidButton>
            <div className="flex items-center justify-between border-t border-hairline pt-3">
              <p className="text-[0.58rem] text-muted-foreground">
                Demo passcode: <span className="font-mono text-gold">{OPERATOR_PASSCODE}</span>
              </p>
              <Pill tone={connection.reachable ? "ok" : "warn"}>
                {connection.reachable ? "Rialo connected" : "simulated"}
              </Pill>
            </div>
          </form>
        </Panel>

        <p className="mt-4 text-center text-[0.6rem] leading-relaxed text-muted-foreground">
          In production this gate is server-side authentication; the wallet remains owned and signed
          by the operator.
        </p>
      </div>
    </div>
  );
}
