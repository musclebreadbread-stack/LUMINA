// src/components/LocationCombobox.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ensureWorldLocationsLoaded,
  isWorldLocationsLoaded,
  searchLocations,
  type LocationSearchResult,
} from "@/lib/locationSearch";
import { resolveTimeZone } from "@engine/shared/timezone";

export interface LocationComboboxProps {
  readonly id: string;
  readonly value: string;
  readonly placeholder: string;
  readonly emptyLabel: string;
  readonly loadingLabel: string;
  readonly onSelect: (entry: { ko: string; en: string; lat: number; lng: number; timeZone: string }) => void;
}

const fieldClass =
  "w-full border border-ink-700 bg-ink-850 px-3 py-2.5 font-mono text-sm text-hobun " +
  "transition-colors hover:border-ink-600 focus:border-hobun focus:outline-none";

function useSyncedQuery(initial: string) {
  const [value, setValue] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    if (value !== initial) setValue(initial);
  }
  return { value, set: setValue };
}

export function LocationCombobox({ id, value, placeholder, emptyLabel, loadingLabel, onSelect }: LocationComboboxProps) {
  const listboxId = `${id}-listbox`;
  const query = useSyncedQuery(value);
  const [isOpen, setIsOpen] = useState(false);
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldReady, setWorldReady] = useState(isWorldLocationsLoaded());
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // worldReady isn't a searchLocations() parameter — it reads a module-scope cache instead of a
  // prop — but it must stay a dependency so this memo re-runs (and picks up world cities) once
  // the async dataset finishes loading after the initial render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = useMemo(() => searchLocations(query.value, 8), [query.value, worldReady]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
      setActiveIndex(-1);
      if (query.value !== value) query.set(value);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [query, value]);

  // Keep aria-activedescendant from pointing at a stale/unmounted option: if results reshuffle
  // (e.g. the world dataset finishes loading mid-session) and activeIndex no longer indexes into
  // the current results, treat it as unset for this render rather than setState-in-effect.
  const safeActiveIndex = activeIndex < results.length ? activeIndex : -1;

  function handleFocus() {
    setIsOpen(true);
    if (!isWorldLocationsLoaded()) {
      setWorldLoading(true);
      ensureWorldLocationsLoaded()
        .then(() => setWorldReady(true))
        .catch(() => {
          /* 검색은 국내 데이터만으로도 계속 동작한다 — 조용히 넘어간다. */
        })
        .finally(() => setWorldLoading(false));
    }
  }

  function handleBlur() {
    // Selecting an option via mouse calls preventDefault() on its mousedown, so the input never
    // blurs during a real selection — this only fires for tab-away / focus-elsewhere without a
    // selection, where we must revert the displayed text to the last committed value.
    setIsOpen(false);
    setActiveIndex(-1);
    if (query.value !== value) query.set(value);
  }

  function selectResult(result: LocationSearchResult) {
    onSelect({
      ko: result.ko,
      en: result.en,
      lat: result.lat,
      lng: result.lng,
      timeZone: resolveTimeZone({ lat: result.lat, lng: result.lng }),
    });
    query.set(result.ko);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (isOpen && safeActiveIndex >= 0 && results[safeActiveIndex]) {
        event.preventDefault();
        selectResult(results[safeActiveIndex]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showEmpty = isOpen && query.value.trim().length > 0 && results.length === 0 && !worldLoading;
  const isListboxOpen = isOpen && (results.length > 0 || worldLoading || showEmpty);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={isListboxOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={safeActiveIndex >= 0 ? `${listboxId}-option-${safeActiveIndex}` : undefined}
        autoComplete="off"
        value={query.value}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(e) => {
          query.set(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={fieldClass}
      />
      {isListboxOpen && (
        <ul id={listboxId} role="listbox" className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-ink-700 bg-ink-850">
          {results.map((result, index) => (
            <li
              key={`${result.lat},${result.lng}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === safeActiveIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus on the input through the click
                selectResult(result);
              }}
              className={`cursor-pointer px-3 py-2 font-mono text-sm ${
                index === safeActiveIndex ? "bg-hobun/15 text-hobun" : "text-hobun-dim hover:bg-ink-800"
              }`}
            >
              {result.ko}
            </li>
          ))}
          {worldLoading && (
            <li className="px-3 py-2 text-xs text-hobun-faint" aria-live="polite">
              {loadingLabel}
            </li>
          )}
          {showEmpty && <li className="px-3 py-2 text-xs text-hobun-faint">{emptyLabel}</li>}
        </ul>
      )}
    </div>
  );
}
