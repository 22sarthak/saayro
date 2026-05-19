"use client";

import { Button, Card } from "@saayro/ui";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BuddyMessageView } from "@/lib/buddy-client";
import {
  fetchBuddyMessages,
  fetchPreTripBuddyMessages,
  postBuddyMessage,
  postPreTripBuddyMessage,
} from "@/lib/buddy-client";

const UNSUPPORTED_OPTION_PATTERNS = [
  "export",
  "share export",
  "export pack",
  "saved place",
  "saved",
  "open in map",
  "open in maps",
  "open map",
  "open route",
  "route handoff",
];

function isUnsupportedOption(label: string): boolean {
  const lower = label.toLowerCase();
  return UNSUPPORTED_OPTION_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function BuddyThreadPanel({
  liveTarget,
  initialMessages,
  emptyPrompts,
  composerPlaceholder,
}: {
  liveTarget: { kind: "trip"; tripId: string } | { kind: "pretrip" } | null;
  initialMessages: BuddyMessageView[];
  emptyPrompts: Array<{ id: string; label: string }>;
  composerPlaceholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState(initialMessages);
  const [composerValue, setComposerValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPromptHandled, setLastPromptHandled] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const promptToSubmit = searchParams.get("prompt");
  const liveEnabled = liveTarget !== null;

  useEffect(() => {
    if (!liveTarget || !liveEnabled) {
      return;
    }

    let active = true;
    startTransition(() => {
      void (liveTarget.kind === "trip" ? fetchBuddyMessages(liveTarget.tripId) : fetchPreTripBuddyMessages())
        .then((nextMessages) => {
          if (!active) {
            return;
          }
          setMessages(nextMessages);
          setErrorMessage(null);
        })
        .catch((error: Error) => {
          if (!active) {
            return;
          }
          setErrorMessage(error.message || "Buddy could not load the live thread right now.");
        });
    });

    return () => {
      active = false;
    };
  }, [liveEnabled, liveTarget]);

  const submitMessage = (content: string, pinnedTripId?: string) => {
    const trimmed = content.trim();
    if (!liveTarget || !liveEnabled || !trimmed) {
      return;
    }
    const effectiveTripId =
      pinnedTripId ?? (liveTarget.kind === "trip" ? liveTarget.tripId : undefined);

    startTransition(() => {
      const request = effectiveTripId
        ? postBuddyMessage(effectiveTripId, trimmed)
        : postPreTripBuddyMessage(trimmed);
      void request
        .then((nextMessages) => {
          setMessages(nextMessages);
          setComposerValue("");
          setErrorMessage(null);
        })
        .catch((error: Error) => {
          setErrorMessage(error.message || "Buddy could not respond right now.");
        });
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage(composerValue);
  };

  useEffect(() => {
    if (!promptToSubmit || !liveEnabled || !liveTarget || promptToSubmit === lastPromptHandled) {
      return;
    }

    submitMessage(promptToSubmit);
    setLastPromptHandled(promptToSubmit);
    const nextUrl =
      liveTarget.kind === "trip" ? `${pathname}?trip=${liveTarget.tripId}` : pathname;
    router.replace(nextUrl);
  }, [lastPromptHandled, liveEnabled, liveTarget, pathname, promptToSubmit, router]);

  return (
    <>
      <div className="grid gap-4">
        {messages.map((message) => {
          const actionItems = message.response?.actions.length ? message.response.actions : message.actions ?? [];
          return (
            <Card
              key={message.id}
              surface={message.role === "buddy" ? "buddy" : "raised"}
              className={message.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto max-w-[90%]"}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{message.role === "buddy" ? "Buddy" : "You"}</p>
                {process.env.NODE_ENV === "development" && message.response?.devMetadata ? (() => {
                  const metadata = message.response.devMetadata;
                  const deterministicProviders = new Set(["mock", "saayro-fallback", "Saayro fallback"]);
                  const isDeterministicFallback = deterministicProviders.has(metadata.provider);
                  const label = isDeterministicFallback
                    ? "Saayro fallback"
                    : `${metadata.provider} · ${metadata.model}${metadata.fallbackUsed ? " · via fallback" : ""}`;
                  return (
                    <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[11px] font-medium text-violet-700">
                      {label}
                    </span>
                  );
                })() : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{message.content}</p>
              {message.response?.guidance ? (
                <p className="mt-3 text-sm leading-7 text-slate-500">{message.response.guidance}</p>
              ) : null}
              {liveEnabled && message.role === "buddy" && message.response?.options?.length ? (() => {
                const safeOptions = message.response.options.filter((option) => !isUnsupportedOption(option));
                if (!safeOptions.length) {
                  return null;
                }
                return (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {safeOptions.map((option, index) => (
                      <button
                        key={`${message.id}-option-${index}`}
                        type="button"
                        onClick={() => submitMessage(option)}
                        disabled={isPending}
                        className="rounded-[18px] bg-amber-100 px-4 py-3 text-left text-sm leading-6 text-slate-700 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                );
              })() : null}
              {actionItems.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {actionItems.map((action) => {
                    const actionType = String(action.type);

                    const actionPayload = action.payload as { trip_id?: string } | undefined;
                    const payloadTripId =
                      typeof actionPayload?.trip_id === "string" && actionPayload.trip_id
                        ? actionPayload.trip_id
                        : undefined;
                    const liveTripId =
                      liveTarget && liveTarget.kind === "trip" ? liveTarget.tripId : undefined;
                    const effectiveTripId = payloadTripId ?? liveTripId;

                    if (actionType === "open_trip_hub") {
                      const href = effectiveTripId
                        ? `/app/trips/${effectiveTripId}`
                        : "/app/trips?create=1&source=buddy";
                      return (
                        <Button key={action.id} variant="secondary" onClick={() => router.push(href)}>
                          {action.label}
                        </Button>
                      );
                    }

                    if (actionType === "plan_itinerary") {
                      if (effectiveTripId) {
                        const href = `/app/buddy?trip=${effectiveTripId}&prompt=${encodeURIComponent("Plan the itinerary for this trip")}`;
                        return (
                          <Button key={action.id} variant="primary" onClick={() => router.push(href)}>
                            {action.label}
                          </Button>
                        );
                      }
                      return (
                        <Button key={action.id} variant="primary" disabled title="No active trip to plan.">
                          {action.label}
                        </Button>
                      );
                    }

                    const isPacing = actionType === "optimize-day" || actionType === "itinerary_refine";
                    if (isPacing && liveEnabled) {
                      if (!effectiveTripId) {
                        return (
                          <Button key={action.id} variant="secondary" disabled title="No active trip to refine.">
                            {action.label}
                          </Button>
                        );
                      }
                      return (
                        <Button
                          key={action.id}
                          variant="secondary"
                          onClick={() => submitMessage(action.label, effectiveTripId)}
                          disabled={isPending}
                        >
                          {action.label}
                        </Button>
                      );
                    }

                    const isExport = actionType === "draft-export" || actionType === "share_export_pack";
                    const isMapHandoff = actionType === "open-map" || actionType === "open_in_maps";
                    const isSaved = actionType === "review_saved_places";
                    const tooltip = isExport
                      ? "Exports coming later"
                      : isMapHandoff
                        ? "Map handoff coming later"
                        : isSaved
                          ? "Saved live binding coming later"
                          : "This action is still view-only in the current web shell.";
                    const label = isExport
                      ? `${action.label} · coming later`
                      : isMapHandoff
                        ? `${action.label} · coming later`
                        : action.label;

                    return (
                      <Button key={action.id} variant="secondary" disabled title={tooltip}>
                        {label}
                      </Button>
                    );
                  })}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-slate-200/70 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">Next move</p>
        {liveEnabled ? (
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <textarea
              value={composerValue}
              onChange={(event) => setComposerValue(event.target.value)}
              rows={4}
              placeholder={composerPlaceholder}
              className="w-full rounded-[20px] border border-slate-200/80 bg-ivory-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
              disabled={isPending}
            />
            {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary" disabled={isPending || composerValue.trim().length === 0}>
                {isPending ? "Sending…" : "Ask Buddy"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 rounded-[20px] bg-ivory-50 p-4 text-sm text-slate-500">
            {composerPlaceholder}
          </div>
        )}
      </div>

      {liveEnabled && messages.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200/80 bg-ivory-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Start with a trip-aware prompt</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {emptyPrompts
              .filter((prompt) => !isUnsupportedOption(prompt.label))
              .map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => submitMessage(prompt.label)}
                  className="rounded-[18px] bg-amber-100 px-4 py-3 text-left text-sm leading-6 text-slate-700 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                >
                  {prompt.label}
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
