"use client";

import type { ConnectedAccount, ConnectedTravelItem } from "@saayro/types";
import { ConnectedSourceTile } from "@saayro/ui";
import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { fetchConnections, fetchTripConnectedItems } from "@/lib/auth-client";

export function TripConnectedLiveRail({
  tripId,
  fallbackAccounts,
  fallbackItems,
}: {
  tripId: string;
  fallbackAccounts: ConnectedAccount[];
  fallbackItems: ConnectedTravelItem[];
}) {
  const { session, state } = useSession();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(fallbackAccounts);
  const [items, setItems] = useState<ConnectedTravelItem[]>(fallbackItems);

  useEffect(() => {
    if (state !== "ready" || !session?.authenticated) {
      setAccounts(fallbackAccounts);
      setItems(fallbackItems);
      return;
    }

    let active = true;
    void Promise.all([fetchConnections(), fetchTripConnectedItems(tripId)])
      .then(([nextAccounts, nextItems]) => {
        if (!active) {
          return;
        }
        setAccounts(nextAccounts);
        setItems(nextItems);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setAccounts(fallbackAccounts);
        setItems(fallbackItems);
      });

    return () => {
      active = false;
    };
  }, [fallbackAccounts, fallbackItems, session?.authenticated, state, tripId]);

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[22px] bg-ivory-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 capitalize text-slate-500">
                {item.provider} · {item.state} · {item.confidence}
              </p>
              {item.metadata.extraction_reason ? <p className="mt-2">{item.metadata.extraction_reason}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3">
        {accounts.map((account) => (
          <ConnectedSourceTile
            key={account.id}
            account={account}
            itemCount={account.importedItemCount ?? items.length}
          />
        ))}
      </div>
    </div>
  );
}
