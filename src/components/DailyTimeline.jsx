import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories.js";
import { DndContext, useSensor, useSensors, PointerSensor, useDraggable } from "@dnd-kit/core";

// Plage horaire imposée par le cahier des charges : 08h00 à 22h00
const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 14 heures = 840 minutes

// Palette de styles CSS par catégorie adaptées au clair et au sombre (avec Tailwind v4)
const CATEGORY_STYLES = {
  dev: {
    border: "border-blue-100 dark:border-blue-950/70 focus-within:ring-blue-400",
    bg: "bg-blue-50/70 hover:bg-blue-50/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-800 dark:text-blue-200",
    badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
    indicator: "bg-blue-500"
  },
  sport: {
    border: "border-emerald-100 dark:border-emerald-950/70 focus-within:ring-emerald-400",
    bg: "bg-emerald-50/70 hover:bg-emerald-50/90 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200",
    badge: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
    indicator: "bg-emerald-500"
  },
  coiffure: {
    border: "border-rose-100 dark:border-rose-950/70 focus-within:ring-rose-400",
    bg: "bg-rose-50/70 hover:bg-rose-50/90 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-200",
    badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
    indicator: "bg-rose-500"
  },
  ecommerce: {
    border: "border-indigo-100 dark:border-indigo-950/70 focus-within:ring-indigo-400",
    bg: "bg-indigo-50/70 hover:bg-indigo-50/90 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200",
    badge: "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300",
    indicator: "bg-indigo-500"
  }
};

// Résoudre le style en fonction du texte de la catégorie
function getStyleForCategory(category) {
  if (!category) return CATEGORY_STYLES.dev;
  const normalized = category.toLowerCase();
  if (normalized.includes("dev") || normalized.includes("informatique") || normalized.includes("slam")) {
    return CATEGORY_STYLES.dev;
  }
  if (normalized.includes("sport") || normalized.includes("tennis")) {
    return CATEGORY_STYLES.sport;
  }
  if (normalized.includes("coif") || normalized.includes("pratique")) {
    return CATEGORY_STYLES.coiffure;
  }
  if (normalized.includes("e-commerce") || normalized.includes("vente") || normalized.includes("commerce") || normalized.includes("indigo")) {
    return CATEGORY_STYLES.ecommerce;
  }
  return CATEGORY_STYLES.dev;
}

// Obtenir le badge court de la catégorie
function getCategoryBadgeText(category) {
  if (!category) return "";
  const normalized = category.toLowerCase();
  if (normalized.includes("dev") || normalized.includes("informatique") || normalized.includes("slam")) {
    return "SLAM";
  }
  if (normalized.includes("sport") || normalized.includes("tennis")) {
    return "Sport";
  }
  if (normalized.includes("coif") || normalized.includes("pratique")) {
    return "Pratique";
  }
  if (normalized.includes("e-commerce") || normalized.includes("vente") || normalized.includes("commerce") || normalized.includes("indigo")) {
    return "Ventes";
  }
  return category.length > 12 ? category.substring(0, 10) + "..." : category;
}

// Fonction pour convertir "HH:MM" en minutes depuis 08:00
function getMinutesFromStart(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  const minutesFromMidnight = hours * 60 + minutes;
  const startMinutesFromMidnight = START_HOUR * 60;
  return minutesFromMidnight - startMinutesFromMidnight;
}

// Fonction pour obtenir le libellé de la catégorie
function getCategoryLabel(categoryId) {
  if (!categoryId) return "Autre";
  const cat = CATEGORIES.find((c) => c.id === categoryId || c.label === categoryId);
  return cat ? cat.label : categoryId;
}

// Composant pour un bloc de temps déplaçable (Draggable)
function DraggableTimeBlock({ block, maxCols, onEditBlock }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
  });

  const style = getStyleForCategory(block.category);
  const colWidth = 100 / maxCols;
  const leftPos = (block.col || 0) * colWidth;

  const dragStyle = {
    top: `${block.top}px`,
    height: `${block.height}px`,
    left: `${leftPos}%`,
    width: `${colWidth - 1}%`,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 10,
    boxShadow: isDragging
      ? "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)"
      : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      style={dragStyle}
      onClick={() => {
        // Déclencher l'édition uniquement si l'élément n'a pas été déplacé (simple clic)
        if (!transform) {
          onEditBlock(block);
        }
      }}
      className={`absolute rounded-2xl border p-3 flex flex-col text-left transition-shadow duration-200 shadow-sm hover:shadow-md cursor-pointer group focus:outline-none focus:ring-2 ${style.border} ${style.bg}`}
      {...listeners}
      {...attributes}
    >
      {/* Indicateur de catégorie vertical sur le côté gauche */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${style.indicator}`} />
      
      <div className="pl-1.5 overflow-hidden flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-extrabold text-sm tracking-tight line-clamp-1 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors">
            {block.title}
          </h4>
          <span className="text-[10px] opacity-75 font-semibold mt-0.5 block">
            {block.startTime} - {block.endTime}
          </span>
          {block.description && block.height >= 90 && (
            <p className="text-[10px] opacity-90 line-clamp-2 mt-1 leading-snug font-medium italic break-words text-slate-600 dark:text-slate-400">
              {block.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {block.height >= 55 && block.category && (
            <span className={`text-[9px] font-bold py-0.5 px-1.5 rounded-md w-fit uppercase tracking-wider ${style.badge}`}>
              {getCategoryBadgeText(block.category)}
            </span>
          )}
          {block.creatorUsername && block.height >= 70 && (
            <span className="text-[9.5px] font-black py-0.5 px-1.5 rounded-md bg-slate-200/40 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 truncate max-w-full">
              👥 Par {block.creatorUsername}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function DailyTimeline({ timeBlocks, onEditBlock, onUpdateBlock }) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState("timeline"); // "timeline" ou "list"

  // Configuration des sensors de dnd-kit pour éviter les conflits avec le clic simple
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de mouvement requis pour démarrer le drag
      },
    })
  );

  // Générer la liste des heures pour l'affichage de l'axe (08:00 à 22:00)
  const hoursList = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hoursList.push(`${String(h).padStart(2, "0")}:00`);
  }

  // Algorithme d'évitement de chevauchement basique pour la vue visuelle
  const processedBlocks = timeBlocks
    .map((block) => {
      const startMin = getMinutesFromStart(block.startTime);
      const endMin = getMinutesFromStart(block.endTime);
      
      // Clamper dans la plage 08:00 - 22:00
      const clampedStart = Math.max(0, Math.min(TOTAL_MINUTES, startMin));
      const clampedEnd = Math.max(0, Math.min(TOTAL_MINUTES, endMin));
      const duration = clampedEnd - clampedStart;

      return {
        ...block,
        top: clampedStart,
        height: Math.max(30, duration) // Minimum 30px de hauteur pour la lisibilité
      };
    })
    // On conserve uniquement les blocs qui sont dans ou chevauchent la plage horaire
    .filter((block) => {
      const blockStart = getMinutesFromStart(block.startTime);
      const blockEnd = getMinutesFromStart(block.endTime);
      return blockEnd > 0 && blockStart < TOTAL_MINUTES;
    });

  // Calcul des colonnes pour éviter le chevauchement visuel des cartes
  const columns = [];
  processedBlocks.forEach((block) => {
    let colIndex = 0;
    while (colIndex < columns.length && columns[colIndex] > block.top) {
      colIndex++;
    }
    block.col = colIndex;
    columns[colIndex] = block.top + block.height;
  });

  const maxCols = columns.length || 1;

  // Gestion de la fin du glissement
  const handleDragEnd = (event) => {
    const { active, delta } = event;
    if (!delta.y) return;

    const block = timeBlocks.find((b) => b.id === active.id);
    if (!block) return;

    // Déplacement en minutes (1px = 1 minute) arrondi à 5 minutes près
    const deltaMinutes = Math.round(delta.y / 5) * 5;
    if (deltaMinutes === 0) return;

    // Récupération des heures d'origine
    const [startH, startM] = block.startTime.split(":").map(Number);
    const [endH, endM] = block.endTime.split(":").map(Number);

    const originalStart = startH * 60 + startM;
    const originalEnd = endH * 60 + endM;
    const duration = originalEnd - originalStart;

    let newStart = originalStart + deltaMinutes;

    // Clamper dans les limites imposées (08:00 à 22:00)
    const minLimit = START_HOUR * 60; // 480 (08:00)
    const maxLimit = END_HOUR * 60; // 1320 (22:00)

    if (newStart < minLimit) {
      newStart = minLimit;
    } else if (newStart + duration > maxLimit) {
      newStart = maxLimit - duration;
    }

    const newEnd = newStart + duration;

    // Convertir de nouveau en chaine "HH:MM"
    const formatMinutesToTimeStr = (minutes) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const newStartTime = formatMinutesToTimeStr(newStart);
    const newEndTime = formatMinutesToTimeStr(newEnd);

    // Mettre à jour dans Firestore si les valeurs ont changé
    if (newStartTime !== block.startTime || newEndTime !== block.endTime) {
      onUpdateBlock(block.id, {
        startTime: newStartTime,
        endTime: newEndTime
      });
    }
  };

  if (timeBlocks.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t("timeline.emptyTitle")}</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
          {t("timeline.emptyDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôle de changement de vue */}
      <div className="flex justify-between items-center bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl w-fit self-end font-sans border border-slate-200/10 dark:border-slate-700/50 transition-colors duration-300">
        <button
          onClick={() => setViewMode("timeline")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            viewMode === "timeline"
              ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {t("timeline.planningView")}
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            viewMode === "list"
              ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {t("timeline.listView")}
        </button>
      </div>

      {/* Rendu dynamique des vues */}
      {viewMode === "timeline" ? (
        /* VUE PLANNING HORAIRE (Visuel - Scroll horizontal et vertical fluide) */
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto font-sans transition-colors duration-300">
            <div className="min-w-[450px] p-6 flex select-none">
              
              {/* 1. Colonne de l'axe vertical des heures */}
              <div className="w-16 shrink-0 relative" style={{ height: `${TOTAL_MINUTES}px` }}>
                {hoursList.map((hourText, idx) => {
                  const topPos = idx * 60; // 60px par heure
                  return (
                    <span
                      key={hourText}
                      className="absolute right-3 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 transition-colors duration-300"
                      style={{ top: `${topPos - 8}px` }} // Aligne le milieu du texte avec la ligne horizontale
                    >
                      {hourText}
                    </span>
                  );
                })}
              </div>

              {/* 2. Grille de la timeline et blocs positionnés */}
              <div className="flex-1 relative border-l border-slate-100 dark:border-slate-800" style={{ height: `${TOTAL_MINUTES}px` }}>
                
                {/* Lignes horizontales d'arrière-plan */}
                {hoursList.map((hourText, idx) => {
                  const topPos = idx * 60;
                  return (
                    <div
                      key={`line-${hourText}`}
                      className="absolute w-full border-t border-slate-100 dark:border-slate-800"
                      style={{ top: `${topPos}px` }}
                    />
                  );
                })}

                {/* Blocs de temps superposés */}
                <div className="h-full relative ml-4">
                  {processedBlocks.map((block) => (
                    <DraggableTimeBlock
                      key={block.id}
                      block={block}
                      maxCols={maxCols}
                      onEditBlock={onEditBlock}
                    />
                  ))}
                </div>

              </div>

            </div>
          </div>
        </DndContext>
      ) : (
        /* VUE LISTE CHRONOLOGIQUE (Idéal mobile) */
        <div className="space-y-3 font-sans">
          {timeBlocks.map((block) => {
            const style = getStyleForCategory(block.category);
            return (
              <button
                key={block.id}
                onClick={() => onEditBlock(block)}
                className={`w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 ${style.border}`}
              >
                <div className="flex items-center gap-3">
                  {/* Indicateur de catégorie de couleur */}
                  <div className={`w-3 h-3 rounded-full shrink-0 ${style.indicator}`} />
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                      {block.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-semibold text-slate-450 dark:text-slate-500">
                        {getCategoryLabel(block.category)}
                      </span>
                      {block.creatorUsername && (
                        <span className="text-[9.5px] font-black py-0.5 px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          👥 Par {block.creatorUsername}
                        </span>
                      )}
                    </div>
                    {block.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-1 max-w-md">
                        {block.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs px-2.5 py-1.5 rounded-xl">
                    {block.startTime} - {block.endTime}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DailyTimeline;
