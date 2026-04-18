"use client";

import type { ConnectedTravelItem } from "@saayro/types";
import { Badge, Button, Card } from "@saayro/ui";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { ButtonLink } from "@/components/ui/button-link";
import {
  fetchConnectedTravelItems,
  fetchTripSummaries,
  reviewConnectedTravelItem,
} from "@/lib/auth-client";

type ReviewStatus = "idle" | "loading" | "ready";

function describeTiming(item: ConnectedTravelItem) {
  return item.endAt ? `${item.startAt} to ${item.endAt}` : item.startAt;
}

function getItemNarrative(item: ConnectedTravelItem) {
  return item.metadata.extraction_reason || item.metadata.summary || item.metadata.location || "Imported travel context ready for review.";
}

export function ConnectedTravelReview() {
  const { session, state } = useSession();
  const [status, setStatus] = useState<ReviewStatus>("loading");
  const [items, setItems] = useState<ConnectedTravelItem[]>([]);
  const [tripOptions, setTripOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedTripIds, setSelectedTripIds] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "ready" || !session?.authenticated) {
      setItems([]);
      setTripOptions([]);
      setSelectedTripIds({});
      setStatus("idle");
      return;
    }

    let active = true;
    setStatus("loading");
    setError(null);
    void Promise.all([fetchConnectedTravelItems(), fetchTripSummaries()])
      .then(([nextItems, trips]) => {
        if (!active) {
          return;
        }
        setItems(nextItems);
        setTripOptions(trips.map((trip) => ({ id: trip.id, title: trip.title })));
        setSelectedTripIds(
          Object.fromEntries(
            nextItems
              .filter((item) => item.state === "candidate" && trips[0]?.id)
              .map((item) => [item.id, trips[0]!.id]),
          ),
        );
        setStatus("ready");
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Connected Travel review could not load right now.");
        setStatus("ready");
      });

    return () => {
      active = false;
    };
  }, [session?.authenticated, state]);

  const candidateItems = useMemo(() => items.filter((item) => item.state === "candidate"), [items]);
  const attachedItems = useMemo(() => items.filter((item) => item.state === "attached"), [items]);
  const ignoredItems = useMemo(() => items.filter((item) => item.state === "ignored"), [items]);

  const reviewItem = async (itemId: string, action: "attach" | "ignore") => {
    setPendingKey(`${itemId}:${action}`);
    setError(null);
    try {
      let updated: ConnectedTravelItem;
      if (action === "attach") {
        const tripId = selectedTripIds[itemId];
        if (!tripId) {
          setError("Choose a trip before attaching this imported travel item.");
          return;
        }
        updated = await reviewConnectedTravelItem(itemId, { action, tripId });
      } else {
        updated = await reviewConnectedTravelItem(itemId, { action });
      }
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      globalThis.window.dispatchEvent(new CustomEvent("connected-travel:refresh"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Connected Travel review could not save this choice.");
    } finally {
      setPendingKey(null);
    }
  };

  if (status === "idle") {
    return null;
  }

  return (
    <div className="section-shell space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Connected Travel review</p>
        <h2 className="font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] text-3xl text-slate-950">
          Review imported travel before it shapes a trip.
        </h2>
        <p className="text-sm leading-7 text-slate-600">
          Imported travel stays reviewable first. Attach the relevant items to a trip, or ignore them intentionally.
        </p>
      </div>

      {candidateItems.length === 0 ? (
        <Card surface="connected" className="space-y-3">
          <p className="text-lg font-semibold text-slate-900">No review-needed items right now</p>
          <p className="text-sm leading-6 text-slate-600">
            Connected Travel is either fully attached to trips already or intentionally reviewed.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {candidateItems.map((item) => {
            const attachDisabled = tripOptions.length === 0 || !selectedTripIds[item.id];
            return (
              <Card key={item.id} surface="connected" className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                      <Badge variant="confidence" confidence={item.confidence} />
                      <Badge variant="connected">Needs review</Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {(item.accountLabel ?? item.provider.toUpperCase())} · {item.itemType} · {describeTiming(item)}
                    </p>
                    <p className="max-w-2xl text-sm leading-6 text-slate-700">{getItemNarrative(item)}</p>
                  </div>
                </div>
                {tripOptions.length > 0 ? (
                  <label className="grid gap-2 text-sm text-slate-600">
                    <span>Attach to trip</span>
                    <select
                      value={selectedTripIds[item.id] ?? ""}
                      onChange={(event) => setSelectedTripIds((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="w-full rounded-[18px] border border-slate-200/80 bg-ivory-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    >
                      <option value="">Choose a trip</option>
                      {tripOptions.map((trip) => (
                        <option key={trip.id} value={trip.id}>
                          {trip.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="rounded-[18px] bg-ivory-50 p-4 text-sm leading-6 text-slate-700">
                    Create a trip in Trip Hub before attaching imported travel context.
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {tripOptions.length > 0 ? (
                    <Button
                      variant="primary"
                      disabled={attachDisabled || pendingKey === `${item.id}:attach`}
                      onClick={() => void reviewItem(item.id, "attach")}
                    >
                      {pendingKey === `${item.id}:attach` ? "Attaching..." : "Attach to trip"}
                    </Button>
                  ) : (
                    <ButtonLink href="/app/trips?create=1" variant="primary">
                      Create trip in Trip Hub
                    </ButtonLink>
                  )}
                  <Button
                    variant="secondary"
                    disabled={pendingKey === `${item.id}:ignore`}
                    onClick={() => void reviewItem(item.id, "ignore")}
                  >
                    {pendingKey === `${item.id}:ignore` ? "Ignoring..." : "Ignore item"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {attachedItems.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attached</p>
          <div className="grid gap-3">
            {attachedItems.map((item) => (
              <Card key={item.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">{item.title}</p>
                  <Badge variant="connected">Attached to trip</Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {(item.accountLabel ?? item.provider.toUpperCase())}
                  {item.tripTitle ? ` · ${item.tripTitle}` : ""}
                </p>
                <p className="text-sm leading-6 text-slate-700">{getItemNarrative(item)}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {ignoredItems.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reviewed and ignored</p>
          <div className="grid gap-3">
            {ignoredItems.map((item) => (
              <Card key={item.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">{item.title}</p>
                  <Badge variant="connected">Ignored</Badge>
                </div>
                <p className="text-sm text-slate-600">{item.accountLabel ?? item.provider.toUpperCase()}</p>
                <p className="text-sm leading-6 text-slate-700">{getItemNarrative(item)}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
