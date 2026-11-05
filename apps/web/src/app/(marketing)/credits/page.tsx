import type { Metadata } from "next";
import Link from "next/link";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import credits from "../../../../public/destinations/credits.json";

export const metadata: Metadata = {
  title: "Photo credits — Saayro"
};

type Credit = { title: string; author: string; license: string; source: string };

export default function CreditsPage() {
  const entries = Object.entries(credits as Record<string, Credit>);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <SaayroLogo />
      <h1 className="display mt-12 text-5xl text-ink-950">Photo credits</h1>
      <p className="mt-4 text-ink-600">Destination photography from Wikimedia Commons contributors, used under the licences below.</p>
      <ul className="mt-10 divide-y divide-sand-200">
        {entries.map(([slug, credit]) => (
          <li key={slug} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-ink-900">{credit.title}</p>
              <p className="text-sm text-ink-500">
                {credit.author} · {credit.license}
              </p>
            </div>
            <Link href={credit.source} className="text-sm text-sunset-600 hover:underline" target="_blank" rel="noreferrer">
              Source ↗
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
