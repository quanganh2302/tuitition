import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { randomBgImage } from "@/lib/utils";
import WeatherCitySwitcher from "./WeatherCitySwitcher";

// Thẻ thời tiết THẬT (Open-Meteo, free, không cần API key). Server component, cache 30 phút.
// Vị trí mặc định Hà Nội — đổi bằng env WEATHER_LAT / WEATHER_LON, hoặc người dùng đổi qua
// WeatherCitySwitcher (lưu cookie weather_lat/weather_lon/weather_city).
const DEFAULT_LAT = process.env.WEATHER_LAT || "21.03";
const DEFAULT_LON = process.env.WEATHER_LON || "105.85";

// WMO weather_code → khoá dịch + emoji.
const describe = (code: number): { key: string; icon: string } => {
  if (code === 0) return { key: "w_clear", icon: "☀️" };
  if (code <= 3) return { key: "w_cloudy", icon: "⛅" };
  if (code <= 48) return { key: "w_fog", icon: "🌫️" };
  if (code <= 67) return { key: "w_rain", icon: "🌧️" };
  if (code <= 77) return { key: "w_snow", icon: "❄️" };
  if (code <= 82) return { key: "w_showers", icon: "🌦️" };
  if (code <= 86) return { key: "w_sleet", icon: "🌨️" };
  return { key: "w_thunder", icon: "⛈️" };
};

type Current = {
  temperature_2m: number;
  relative_humidity_2m: number;
  surface_pressure: number;
  wind_speed_10m: number;
  weather_code: number;
};

const WeatherCard = async () => {
  const store = cookies();
  const lat = store.get("weather_lat")?.value || DEFAULT_LAT;
  const lon = store.get("weather_lon")?.value || DEFAULT_LON;
  const cityCookie = store.get("weather_city")?.value;

  let cur: Current | null = null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (res.ok) cur = (await res.json()).current;
  } catch {
    cur = null; // không có mạng → hiện "—"
  }

  const t = await getTranslations("Dashboard");
  const city = cityCookie ? decodeURIComponent(cityCookie) : t("weather_default_city");
  const d = cur ? describe(cur.weather_code) : { key: "weather_none", icon: "🌡️" };
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 flex-1 min-w-[200px] text-white bg-gradient-to-br from-sky-400 to-blue-600 bg-cover bg-center"
      style={{ backgroundImage: `url(${randomBgImage()})` }}
    >
      <div className="absolute inset-0 z-0 bg-black/30" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{d.icon}</span>
            <div>
              <h3 className="text-sm font-semibold">{t("weather")}</h3>
              <p className="text-xs opacity-80">
                {city} · {t(d.key)}
              </p>
            </div>
          </div>
          <WeatherCitySwitcher city={city} />
        </div>
        <p className="text-4xl font-semibold my-3">
          {cur ? Math.round(cur.temperature_2m) : "—"}°C
        </p>
        <div className="flex items-center justify-between gap-2 text-center">
          <div className="bg-white/20 rounded-xl flex-1 px-2 py-2">
            <p className="text-[11px] opacity-80">{t("weather_humidity")}</p>
            <p className="text-sm font-semibold">{cur ? `${cur.relative_humidity_2m}%` : "—"}</p>
          </div>
          <div className="bg-white/20 rounded-xl flex-1 px-2 py-2">
            <p className="text-[11px] opacity-80">{t("weather_pressure")}</p>
            <p className="text-sm font-semibold">{cur ? `${Math.round(cur.surface_pressure)}mb` : "—"}</p>
          </div>
          <div className="bg-white/20 rounded-xl flex-1 px-2 py-2">
            <p className="text-[11px] opacity-80">{t("weather_wind")}</p>
            <p className="text-sm font-semibold">{cur ? `${Math.round(cur.wind_speed_10m)}km/h` : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
