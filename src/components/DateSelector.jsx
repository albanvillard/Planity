import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getTodayDateString, shiftDate } from "../utils/date.js";

/**
 * Formate une date "YYYY-MM-DD" en texte convivial dans la langue spécifiée.
 */
function formatDateFriendly(dateStr, lang) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  let locale = "fr-FR";
  if (lang === "en") locale = "en-US";
  else if (lang === "es") locale = "es-ES";
  else if (lang === "it") locale = "it-IT";

  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
  
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Composant DateSelector pour naviguer entre les jours.
 * 
 * @param {string} selectedDate La date sélectionnée ("YYYY-MM-DD").
 * @param {function} onChangeDate Callback déclenché lors du changement de date.
 */
export function DateSelector({ selectedDate, onChangeDate }) {
  const { t, i18n } = useTranslation();

  const isToday = useMemo(() => {
    return selectedDate === getTodayDateString();
  }, [selectedDate]);

  const dateLabel = useMemo(() => {
    return formatDateFriendly(selectedDate, i18n.language);
  }, [selectedDate, i18n.language]);

  const handlePrevDay = () => {
    onChangeDate(shiftDate(selectedDate, -1));
  };

  const handleNextDay = () => {
    onChangeDate(shiftDate(selectedDate, 1));
  };

  const handleToday = () => {
    onChangeDate(getTodayDateString());
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 font-sans w-full">
      {/* Bouton de retour rapide "Aujourd'hui" */}
      <div className="shrink-0">
        {!isToday ? (
          <button
            onClick={handleToday}
            type="button"
            className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300 font-extrabold px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t("dateSelector.today")}
          </button>
        ) : (
          <span className="text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-550 font-bold px-3 py-2 rounded-xl">
            {t("dateSelector.today")}
          </span>
        )}
      </div>

      {/* Zone centrale de navigation fléchée */}
      <div className="flex items-center gap-4">
        {/* Bouton jour précédent */}
        <button
          onClick={handlePrevDay}
          type="button"
          className="text-slate-400 dark:text-slate-550 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 transition-all duration-200 cursor-pointer active:scale-90"
          aria-label={t("dateSelector.prevDay")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Date formatée */}
        <h3 className="text-sm sm:text-base font-extrabold text-slate-700 dark:text-slate-200 min-w-[200px] text-center tracking-tight">
          {dateLabel}
        </h3>

        {/* Bouton jour suivant */}
        <button
          onClick={handleNextDay}
          type="button"
          className="text-slate-400 dark:text-slate-550 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 transition-all duration-200 cursor-pointer active:scale-90"
          aria-label={t("dateSelector.nextDay")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Espace factice ou indicateur à droite pour équilibrer la mise en page flex sur grand écran */}
      <div className="hidden sm:block w-[90px]" />
    </div>
  );
}

export default DateSelector;
