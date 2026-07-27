import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories.js";
import useWeeklyTimeBlocks from "../hooks/useWeeklyTimeBlocks.js";
import { getWeekRange } from "../utils/date.js";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Résoudre la couleur en fonction du texte de la catégorie
function getCategoryColor(category) {
  if (!category) return "#64748b"; // slate-500
  const normalized = category.toLowerCase();
  if (normalized.includes("dev") || normalized.includes("informatique") || normalized.includes("slam")) {
    return "#3b82f6"; // blue-500
  }
  if (normalized.includes("sport") || normalized.includes("tennis")) {
    return "#10b981"; // emerald-500
  }
  if (normalized.includes("coif") || normalized.includes("pratique")) {
    return "#f43f5e"; // rose-500
  }
  if (normalized.includes("e-commerce") || normalized.includes("vente") || normalized.includes("commerce") || normalized.includes("indigo")) {
    return "#6366f1"; // indigo-500
  }
  return "#8b5cf6"; // purple-500 (défaut pour personnalisé)
}

// Fonction pour obtenir le libellé de la catégorie
function getCategoryLabel(categoryId) {
  if (!categoryId) return "Autre";
  const cat = CATEGORIES.find((c) => c.id === categoryId || c.label === categoryId);
  return cat ? cat.label : categoryId;
}

// Fonction pour convertir les horaires en minutes de durée
function getDurationInMinutes(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  return Math.max(0, endMin - startMin);
}

/**
 * Composant StatisticsDashboard
 * Affiche la répartition du temps de l'utilisateur pour la semaine de la date active.
 */
export function StatisticsDashboard({ user, selectedDate, theme }) {
  const { t } = useTranslation();
  const { weeklyBlocks, loading, error } = useWeeklyTimeBlocks(user.uid, selectedDate);
  const isDark = theme === "dark";

  const weekRange = useMemo(() => {
    if (!selectedDate) return { start: "", end: "" };
    return getWeekRange(selectedDate);
  }, [selectedDate]);

  // Formater les dates de la semaine en format lisible
  const formatDateFriendly = (dateStr) => {
    if (!dateStr) return "";
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (weeklyBlocks.length === 0) {
      return { chartData: [], totalHours: 0, mainCategory: "Aucune", mainCategoryHours: 0 };
    }

    const aggregated = {};
    let totalMin = 0;

    weeklyBlocks.forEach((block) => {
      const minutes = getDurationInMinutes(block.startTime, block.endTime);
      totalMin += minutes;

      const label = getCategoryLabel(block.category);
      if (!aggregated[label]) {
        aggregated[label] = {
          name: label,
          value: 0,
          color: getCategoryColor(block.category)
        };
      }
      aggregated[label].value += minutes;
    });

    // Convertir en heures et formater pour Recharts
    const chartData = Object.values(aggregated)
      .map((item) => ({
        ...item,
        value: Number((item.value / 60).toFixed(1)) // conversion en heures (1 décimale)
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalHours = Number((totalMin / 60).toFixed(1));

    // Déterminer la catégorie principale
    let mainCategory = "Aucune";
    let mainCategoryHours = 0;
    if (chartData.length > 0) {
      mainCategory = chartData[0].name;
      mainCategoryHours = chartData[0].value;
    }

    return {
      chartData,
      totalHours,
      mainCategory,
      mainCategoryHours
    };
  }, [weeklyBlocks]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">{t("stats.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350 rounded-3xl p-6 text-sm">
        <span className="font-bold">{t("stats.error")}</span>
      </div>
    );
  }

  if (stats.chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 font-sans">{t("stats.emptyTitle")}</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto font-sans">
          {t("stats.emptyDesc", { start: formatDateFriendly(weekRange.start), end: formatDateFriendly(weekRange.end) })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Résumé sous forme de cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total d'heures */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-650 dark:to-purple-750 text-white rounded-3xl p-6 shadow-lg shadow-indigo-500/10 dark:shadow-purple-950/20 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-75">
              {t("stats.timePlanned")}
            </span>
            <h3 className="text-3xl font-black mt-2">
              {t("stats.hours", { count: stats.totalHours })}
            </h3>
          </div>
          <span className="text-xs opacity-75 mt-4 font-semibold">
            {t("stats.weekRange", { start: formatDateFriendly(weekRange.start), end: formatDateFriendly(weekRange.end) })}
          </span>
        </div>

        {/* Focus Principal */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors duration-300">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t("stats.mainFocus")}
            </span>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-2 line-clamp-1">
              {stats.mainCategory}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              {stats.mainCategoryHours > 1
                ? t("stats.focusHours_plural", { count: stats.mainCategoryHours })
                : t("stats.focusHours", { count: stats.mainCategoryHours })}
            </p>
          </div>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-4">
            {t("stats.mainFocusDesc")}
          </span>
        </div>
      </div>

      {/* 2. Graphique Circulaire et Légende */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-6 items-center transition-colors duration-300">
        {/* Graphique */}
        <div className="md:col-span-3 flex justify-center">
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} ${t("stats.hoursShort")}`, t("stats.chartDuration")]}
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#fff",
                    borderRadius: "16px",
                    border: isDark ? "1px solid #334155" : "1px solid #f1f5f9",
                    color: isDark ? "#f1f5f9" : "#1e293b",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
                  }}
                  itemStyle={{
                    color: isDark ? "#f1f5f9" : "#1e293b"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Liste détaillée */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t("stats.distribution")}
          </h4>
          <div className="space-y-3">
            {stats.chartData.map((item, idx) => {
              const percentage = Math.round((item.value / stats.totalHours) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-700 dark:text-slate-305 flex items-center gap-2 line-clamp-1">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-bold text-slate-500 dark:text-slate-400">
                      {item.value} {t("stats.hoursShort")} ({percentage}%)
                    </span>
                  </div>
                  {/* Barre de progression */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: item.color,
                        width: `${percentage}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsDashboard;
