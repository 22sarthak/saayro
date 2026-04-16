"use client";

import type { ConnectedAccount } from "@saayro/types";
import { Button, ConnectedSourceTile } from "@saayro/ui";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import {
  disconnectConnection,
  fetchConnections,
  getConnectorStartUrl,
  syncConnection,
} from "@/lib/auth-client";

export function LiveConnectedAccounts({
  fallbackAccounts,
  className = "grid gap-3",
}: {
  fallbackAccounts: ConnectedAccount[];
  className?: string;
}) {
  const pathname = usePathname();
  const { session, state } = useSession();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(fallbackAccounts);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "ready" || !session?.authenticated) {
      setAccounts(fallbackAccounts);
      return;
    }

    let active = true;
    void fetchConnections()
      .then((nextAccounts) => {
        if (active) {
          setAccounts(nextAccounts);
        }
      })
      .catch(() => {
        if (active) {
          setAccounts(fallbackAccounts);
        }
      });

    return () => {
      active = false;
    };
  }, [fallbackAccounts, session?.authenticated, state]);

  return (
    <div className="space-y-3">
      <div className={className}>
        {accounts.map((account) => (
          <div key={account.id} className="space-y-3 rounded-[24px] border border-slate-200/70 bg-white p-4">
            <ConnectedSourceTile
              account={account}
              itemCount={account.importedItemCount ?? account.attachedItemCount ?? 0}
            />
            <div className="flex flex-wrap gap-2">
              {account.state === "not-connected" || account.state === "revoked" ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    globalThis.window.location.href = getConnectorStartUrl(
                      account.provider === "calendar" ? "calendar" : "gmail",
                      pathname,
                    );
                  }}
                >
                  {account.provider === "gmail" ? "Link Gmail" : "Link Calendar"}
                </Button>
              ) : null}
              {account.state !== "not-connected" && account.state !== "revoked" ? (
                <Button
                  variant="secondary"
                  disabled={pendingProvider === account.provider}
                  onClick={() => {
                    setPendingProvider(account.provider);
                    setError(null);
                    void syncConnection(account.provider)
                      .then((nextAccount) => {
                        setAccounts((current) =>
                          current.map((item) => (item.provider === nextAccount.provider ? nextAccount : item)),
                        );
                      })
                      .catch((requestError) => {
                        setError(requestError instanceof Error ? requestError.message : "Could not refresh Connected Travel.");
                      })
                      .finally(() => {
                        setPendingProvider(null);
                      });
                  }}
                >
                  {pendingProvider === account.provider ? "Refreshing..." : "Refresh travel context"}
                </Button>
              ) : null}
              {account.state !== "not-connected" ? (
                <Button
                  variant="ghost"
                  disabled={pendingProvider === account.provider}
                  onClick={() => {
                    setPendingProvider(account.provider);
                    setError(null);
                    void disconnectConnection(account.provider)
                      .then(() => {
                        setAccounts((current) =>
                          current.map((item) =>
                            item.provider === account.provider
                              ? {
                                  ...item,
                                  state: "revoked",
                                  attachedItemCount: 0,
                                  reviewNeededItemCount: 0,
                                  importedItemCount: 0,
                                  statusMessage: "Connector disconnected.",
                                }
                              : item,
                          ),
                        );
                      })
                      .catch((requestError) => {
                        setError(requestError instanceof Error ? requestError.message : "Could not disconnect this source.");
                      })
                      .finally(() => {
                        setPendingProvider(null);
                      });
                  }}
                >
                  Disconnect
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
