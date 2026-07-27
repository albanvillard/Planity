import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Calcule le temps restant sous forme d'objet contenant le texte et le statut expiré.
 * 
 * @param {string} endDateTimeStr - Date et heure de fin au format "YYYY-MM-DDTHH:MM"
 * @param {Date} now - Date actuelle
 * @returns {object} { expired: boolean, text: string }
 */
function calculateTimeRemaining(endDateTimeStr, now) {
  if (!endDateTimeStr) return { expired: true, text: "" };
  
  const end = new Date(endDateTimeStr);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { expired: true, text: "" };
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const seconds = diffSecs % 60;
  const minutes = Math.floor(diffSecs / 60) % 60;
  const hours = Math.floor(diffSecs / 3600);
  
  return {
    expired: false,
    text: `${hours}h ${minutes}m ${seconds}s`
  };
}

/**
 * Résout le style CSS Tailwind pour la catégorie.
 */
function getCategoryBadgeClass(category) {
  if (!category) return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350";
  const normalized = category.toLowerCase();
  if (normalized.includes("dev") || normalized.includes("informatique") || normalized.includes("slam")) {
    return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
  }
  if (normalized.includes("sport") || normalized.includes("tennis")) {
    return "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300";
  }
  if (normalized.includes("coif") || normalized.includes("pratique")) {
    return "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300";
  }
  if (normalized.includes("e-commerce") || normalized.includes("vente") || normalized.includes("commerce") || normalized.includes("indigo")) {
    return "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300";
  }
  return "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300";
}

/**
 * Composant de bannière individuelle pour un traqueur.
 */
function TrackerCard({ tracker, now, onEditBlock }) {
  const { t } = useTranslation();
  const { expired, text } = calculateTimeRemaining(tracker.endDateTime, now);

  return (
    <button
      onClick={() => onEditBlock(tracker)}
      className={`w-full flex flex-col sm:flex-row sm:items-center sm:justify-between p-4.5 rounded-2xl border transition-all duration-300 text-left hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm ${
        expired
          ? "bg-emerald-50/50 hover:bg-emerald-50/80 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-350"
          : "bg-indigo-50/40 hover:bg-indigo-50/60 dark:bg-slate-900/60 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-205"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Indicateur de statut */}
        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${expired ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"}`} />
        
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-extrabold text-sm sm:text-base leading-tight">
              {tracker.title}
            </h4>
            <span className={`text-[10px] font-bold py-0.5 px-2 rounded-md uppercase tracking-wider ${getCategoryBadgeClass(tracker.category)}`}>
              {tracker.category || "Autre"}
            </span>
          </div>
          {tracker.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 max-w-lg">
              {tracker.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <span className={`inline-block font-black text-sm px-3.5 py-1.5 rounded-xl ${
          expired
            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
            : "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400"
        }`}>
          {expired ? t("trackers.expired") : t("trackers.remaining", { time: text })}
        </span>
      </div>
    </button>
  );
}

/**
 * Composant principal LongTermTrackers qui écoute Firestore et affiche les traqueurs actifs.
 */
export function LongTermTrackers({ userId, onEditBlock }) {
  const { t } = useTranslation();
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // 1. Écouteur Firestore pour récupérer les traqueurs de l'utilisateur
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "time_blocks"),
      where("userId", "==", userId),
      where("isLongTerm", "==", true)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const list = [];
        querySnapshot.forEach((docSnapshot) => {
          list.push({
            id: docSnapshot.id,
            ...docSnapshot.data()
          });
        });
        
        // Trier par date de fin
        list.sort((a, b) => (a.endDateTime || "").localeCompare(b.endDateTime || ""));
        setTrackers(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur LongTermTrackers onSnapshot :", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 2. Intervalle de mise à jour du compte à rebours toutes les secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return null; // Chargement silencieux en arrière-plan
  if (trackers.length === 0) return null; // N'affiche rien s'il n'y a aucun traqueur

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300 space-y-4">
      <div className="flex items-center gap-2">
        {/* Icône Sablier */}
        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
          {t("trackers.title")}
        </h3>
        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-extrabold text-[10px] py-0.5 px-2 rounded-full">
          {trackers.length}
        </span>
      </div>

      <div className="space-y-3.5">
        {trackers.map((tracker) => (
          <TrackerCard
            key={tracker.id}
            tracker={tracker}
            now={now}
            onEditBlock={onEditBlock}
          />
        ))}
      </div>
    </div>
  );
}

export default LongTermTrackers;
