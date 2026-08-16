"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Nút bút chì mở ô tìm thành phố (Open-Meteo Geocoding API, free, không cần key).
// Chọn xong lưu lat/lon/tên vào cookie rồi reload — WeatherCard đọc lại từ cookie.
type GeoResult = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };

const WeatherCitySwitcher = ({ city }: { city: string }) => {
  const t = useTranslations("Dashboard");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const search = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    if (!value.trim()) return setResults([]);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=5&language=vi`
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      }
    }, 400);
  };

  const pick = (r: GeoResult) => {
    const name = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
    document.cookie = `weather_lat=${r.latitude}; path=/; max-age=31536000`;
    document.cookie = `weather_lon=${r.longitude}; path=/; max-age=31536000`;
    document.cookie = `weather_city=${encodeURIComponent(name)}; path=/; max-age=31536000`;
    window.location.reload();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={t("weather_change_city")}
        className="text-white/80 hover:text-white shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative shrink-0">
      <input
        autoFocus
        value={query}
        onChange={(e) => search(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={city}
        className="text-xs text-gray-800 rounded px-2 py-1 w-28 outline-none"
      />
      {results.length > 0 && (
        <ul className="absolute right-0 mt-1 w-48 bg-white text-gray-800 text-xs rounded-lg shadow-lg overflow-hidden z-10">
          {results.map((r) => (
            <li key={`${r.latitude},${r.longitude}`}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WeatherCitySwitcher;
