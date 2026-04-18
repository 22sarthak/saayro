"use client";

import type { ConnectedAccount, ConnectedTravelItem } from "@saayro/types";
import { ConnectedSourceTile } from "@saayro/ui";
import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { ButtonLink } from "@/components/ui/button-link";
import { fetchConnections, fetchTripConnectedItems } from "@/lib/auth-client";

function isPersistedTripId(tripId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tripId);
}

export function TripConnectedReviewRail({
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
    const refreshRail = () => {
      const itemsPromise = isPersistedTripId(tripId) ? fetchTripConnectedItems(tripId) : Promise.resolve(fallbackItems);
      void Promise.all([fetchConnections(), itemsPromise])
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
    };

    refreshRail();
    const handleRefresh = () => refreshRail();
    globalThis.window.addEventListener("connected-travel:refresh", handleRefresh);

    return () => {
      active = false;
      globalThis.window.removeEventListener("connected-travel:refresh", handleRefresh);
    };
  }, [fallbackAccounts, fallbackItems, session?.authenticated, state, tripId]);

  const reviewNeededCount = accounts.reduce((total, account) => total + (account.reviewNeededItemCount ?? 0), 0);

  return (
    <div className="space-y-3">
      {reviewNeededCount > 0 ? (
        <div className="rounded-[22px] bg-amber-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-900">
            {reviewNeededCount} imported travel item{reviewNeededCount === 1 ? "" : "s"} still need review.
          </p>
          <p className="mt-1">Review them in Profile before they influence the trip more confidently.</p>
          <div className="mt-3">
            <ButtonLink href="/app/profile" variant="secondary">Review Connected Travel</ButtonLink>
          </div>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[22px] bg-ivory-50 p-4 text-sm leading-6 text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <span className="rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  Attached to trip
                </span>
              </div>
              <p className="mt-1 text-slate-500">
                {item.accountLabel ?? item.provider.toUpperCase()} · {item.itemType} · {item.confidence}
              </p>
              {item.metadata.extraction_reason ? <p className="mt-2">{item.metadata.extraction_reason}</p> : null}
              {item.metadata.summary ? <p className="mt-2 text-slate-600">{item.metadata.summary}</p> : null}
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
