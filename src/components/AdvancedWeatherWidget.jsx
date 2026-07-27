import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const WEATHER_CODE_KEYS = {
  0: "sunny",
  1: "mainlyClear",
  2: "partlyCloudy",
  3: "overcast",
  45: "fog",
  48: "depositingRimeFog",
  51: "lightDrizzle",
  53: "moderateDrizzle",
  55: "denseDrizzle",
  61: "lightRain",
  63: "moderateRain",
  65: "heavyRain",
  71: "lightSnow",
  73: "moderateSnow",
  75: "heavySnow",
  80: "lightShowers",
  81: "moderateShowers",
  82: "heavyShowers",
  95: "thunderstorm",
  96: "thunderstormSlightHail",
  99: "thunderstormHeavyHail"
};

/**
 * Récupère l'emoji et la clé de traduction i18n associés au code météo Open-Meteo.
 */
function getWeatherDetails(code) {
  const name = WEATHER_CODE_KEYS[code] || "unknown";
  
  let emoji = "🌡️";
  if (code === 0) emoji = "☀️";
  else if (code >= 1 && code <= 3) emoji = "⛅";
  else if (code === 45 || code === 48) emoji = "🌫️";
  else if (code >= 51 && code <= 55) emoji = "🌧️";
  else if (code >= 61 && code <= 65) emoji = "🌧️";
  else if (code >= 71 && code <= 75) emoji = "❄️";
  else if (code >= 80 && code <= 82) emoji = "🌧️";
  else if (code >= 95 && code <= 99) emoji = "⚡";

  return { emoji, i18nKey: `weather.${name}` };
}

// Coordonnées et nom de ville par défaut (Lyon)
const DEFAULT_COORDS = { lat: 45.76, lon: 4.83, name: "Lyon" };

/**
 * AdvancedWeatherWidget - Composant météo riche de style iOS pour le Dashboard.
 * Charge initialement Lyon et permet à l'utilisateur de se géolocaliser en cliquant sur une icône.
 */
export function AdvancedWeatherWidget() {
  const { t, i18n } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(false);

  // Chargement initial avec les données par défaut de Lyon
  useEffect(() => {
    let active = true;

    async function loadInitialWeather() {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_COORDS.lat}&longitude=${DEFAULT_COORDS.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis`
        );
        if (!response.ok) {
          throw new Error("Erreur réseau");
        }
        const data = await response.json();
        
        if (active && data.current_weather && data.daily) {
          setWeather({
            temp: Math.round(data.current_weather.temperature),
            code: data.current_weather.weathercode,
            max: Math.round(data.daily.temperature_2m_max[0]),
            min: Math.round(data.daily.temperature_2m_min[0]),
            cityName: DEFAULT_COORDS.name
          });
          setError(false);
        }
      } catch (err) {
        console.error("Échec du chargement météo par défaut :", err);
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitialWeather();

    return () => {
      active = false;
    };
  }, []);

  // Déclencheur manuel de la géolocalisation au clic
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert(t("weather.locationRequired"));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        let cityName = "Ma position";
        try {
          const lang = i18n.language || "fr";
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            cityName = geoData.city || geoData.locality || geoData.principalSubdivision || "Ma position";
          }
        } catch (geoErr) {
          console.error("Erreur de géocodage inverse :", geoErr);
        }

        try {
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis`
          );
          if (!weatherRes.ok) {
            throw new Error("Erreur réseau météo");
          }
          const weatherData = await weatherRes.json();
          
          if (weatherData.current_weather && weatherData.daily) {
            setWeather({
              temp: Math.round(weatherData.current_weather.temperature),
              code: weatherData.current_weather.weathercode,
              max: Math.round(weatherData.daily.temperature_2m_max[0]),
              min: Math.round(weatherData.daily.temperature_2m_min[0]),
              cityName
            });
            setError(false);
          }
        } catch (weatherErr) {
          console.error("Erreur de récupération météo :", weatherErr);
          setError(true);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn("Géolocalisation refusée ou indisponible :", err);
        alert(t("weather.locationRequired"));
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-[190px] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse flex flex-col justify-between p-6 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/3" />
        <div className="h-12 bg-slate-300 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
      </div>
    );
  }

  if (error || !weather) {
    return null; // Masqué discrètement en cas d'erreur
  }

  const { emoji, i18nKey } = getWeatherDetails(weather.code);

  return (
    <div className="w-full h-full min-h-[190px] rounded-3xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 dark:from-sky-500 dark:via-blue-600 dark:to-indigo-850 p-6 text-white flex flex-col justify-between shadow-lg shadow-blue-500/10 dark:shadow-indigo-950/20 border border-white/10">
      
      {/* Haut : Localisation + Bouton Actualiser */}
      <div className="flex items-center justify-between w-full opacity-90">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-extrabold tracking-tight truncate">{weather.cityName}</span>
        </div>

        <button
          onClick={handleGeolocation}
          disabled={locating}
          type="button"
          className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all cursor-pointer text-white flex items-center justify-center disabled:opacity-50 shrink-0"
          title={t("weather.refreshPosition")}
        >
          {locating ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v2m0 16v2M4 12H2m20 0h-2" />
            </svg>
          )}
        </button>
      </div>

      {/* Centre : Température géante */}
      <div className="my-2 flex items-baseline">
        <span className="text-6xl font-black tracking-tighter leading-none">{weather.temp}</span>
        <span className="text-3xl font-extrabold leading-none select-none">°</span>
      </div>

      {/* Bas : Emoji, Description, Ligne Min/Max */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none" role="img" aria-label={t(i18nKey)}>
            {emoji}
          </span>
          <span className="text-xs font-bold leading-tight line-clamp-1">{t(i18nKey)}</span>
        </div>
        <div className="text-[11px] font-extrabold opacity-90 flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7 7 7M12 3v18" />
            </svg>
            <span>{weather.max}°</span>
          </span>
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7-7-7M12 21V3" />
            </svg>
            <span>{weather.min}°</span>
          </span>
        </div>
      </div>
      
    </div>
  );
}

export default AdvancedWeatherWidget;
