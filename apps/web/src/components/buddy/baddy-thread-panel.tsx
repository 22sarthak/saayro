"use client";

import { Button, Card } from "@saayro/ui";
import { useState, useTransition } from "react";
import type { BuddyMessageView } from "@/lib/buddy-client";
import { postBuddyMessage } from "@/lib/buddy-client";

export function BuddyThreadPanel({
  tripId,
  initialMessages,
  emptyPrompts,
  liveEnabled,
}: {
  tripId: string | null;
  initialMessages: BuddyMessageView[];
  emptyPrompts: Array<{ id: string; label: string }>;
  liveEnabled: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [composerValue, setComposerValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitMessage = (content: string) => {
    const trimmed = content.trim();
    if (!tripId || !liveEnabled || !trimmed) {
      return;
    }

    startTransition(() => {
      void postBuddyMessage(tripId, trimmed)
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
                {process.env.NODE_ENV === "development" && message.response?.devMetadata ? (
                  <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[11px] font-medium text-violet-700">
                    {message.response.devMetadata.provider} / {message.response.devMetadata.model}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{message.content}</p>
              {message.response?.guidance ? (
                <p className="mt-3 text-sm leading-7 text-slate-500">{message.response.guidance}</p>
              ) : null}
              {actionItems.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {actionItems.map((action) => (
                    <Button key={action.id} variant="secondary" disabled title="Product actions are still view-only on the web shell.">
                      {action.label}
                    </Button>
                  ))}
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
              placeholder="Ask about pacing, Connected Travel review, route handoff, or the right Export Pack for this trip."
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
            Ask about pacing, Connected Travel review, route handoff, or the right Export Pack for this trip.
          </div>
        )}
      </div>

      {liveEnabled && messages.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200/80 bg-ivory-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Start with a trip-aware prompt</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {emptyPrompts.map((prompt) => (
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
