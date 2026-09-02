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
  const lastInitial = useRef(initial);
  if (lastInitial.current !== initial) {
    lastInitial.current = initial;
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

  const results = useMemo(() => searchLocations(query.value, 8), [query.value, worldReady]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        selectResult(results[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showEmpty = isOpen && query.value.trim().length > 0 && results.length === 0 && !worldLoading;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query.value}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={(e) => {
          query.set(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={fieldClass}
      />
      {isOpen && (results.length > 0 || worldLoading || showEmpty) && (
        <ul id={listboxId} role="listbox" className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-ink-700 bg-ink-850">
          {results.map((result, index) => (
            <li
              key={`${result.lat},${result.lng}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus on the input through the click
                selectResult(result);
              }}
              className={`cursor-pointer px-3 py-2 font-mono text-sm ${
                index === activeIndex ? "bg-hobun/15 text-hobun" : "text-hobun-dim hover:bg-ink-800"
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
