import { getTranslations } from "next-intl/server";
import type { ReadingNote } from "@engine/horoscope";

const NOTE_MESSAGE_KEY: Readonly<Record<ReadingNote["id"], string>> = Object.freeze({
  utcNoonReference: "noteUtcNoonReference",
  wholeSignPrecision: "noteWholeSignPrecision",
  degreeTransitPrecision: "noteDegreeTransitPrecision",
  culturalTier: "noteCulturalTier",
});

export async function ReadingNotes({ notes }: { readonly notes: readonly ReadingNote[] }) {
  const t = await getTranslations("horoscopeReading");

  return (
    <div className="mt-6 border-t border-ink-800 pt-5">
      <h3 className="text-[13px] text-hobun-dim">{t("readingNotesTitle")}</h3>
      <ul className="mt-3 space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="border-l border-ink-600 pl-3 text-xs leading-relaxed text-hobun-faint">
            {t(NOTE_MESSAGE_KEY[note.id])}
          </li>
        ))}
      </ul>
    </div>
  );
}
