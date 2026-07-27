import { useState } from "react";
import { useTranslation } from "react-i18next";
import useTimeBlocks from "../hooks/useTimeBlocks.js";
import DailyTimeline from "./DailyTimeline.jsx";
import BlockFormModal from "./BlockFormModal.jsx";
import DateSelector from "./DateSelector.jsx";
import { getTodayDateString, shiftDate } from "../utils/date.js";
import StatisticsDashboard from "./StatisticsDashboard.jsx";
import useTheme from "../hooks/useTheme.js";
import useNotifications from "../hooks/useNotifications.js";
import { LongTermTrackers } from "./LongTermTrackers.jsx";
import { AdvancedWeatherWidget } from "./AdvancedWeatherWidget.jsx";
import Header from "./Header.jsx";
import ProfileSettings from "./ProfileSettings.jsx";

/**
 * Composant principal Dashboard affiché à l'utilisateur connecté.
 * Gère désormais le sélecteur de date pour naviguer de jour en jour et le Mode Sombre.
 * 
 * @param {object} user L'objet utilisateur de Firebase Auth.
 * @param {function} onLogout Fonction pour déconnecter l'utilisateur.
 */
export function Dashboard({ user, onLogout, refreshUser }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  // Activer et gérer la logique de notifications locales pour l'utilisateur
  const { permission, requestPermission } = useNotifications(user.uid);

  // État de la date sélectionnée (initialisé sur aujourd'hui au format "YYYY-MM-DD")
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [activeTab, setActiveTab] = useState("planning"); // "planning" ou "stats"

  // Charger le CRUD et l'écouteur temps réel pour la date spécifique depuis useTimeBlocks
  const {
    timeBlocks,
    loading,
    error,
    addTimeBlock,
    updateTimeBlock,
    deleteTimeBlock
  } = useTimeBlocks(user.uid, selectedDate);

  // États pour gérer l'ouverture de la modale et le bloc sélectionné pour édition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Ouvrir la modale en mode Création
  const handleOpenAddModal = () => {
    setSelectedBlock(null);
    setIsModalOpen(true);
  };

  // Ouvrir la modale en mode Édition pour un bloc cliqué
  const handleOpenEditModal = (block) => {
    setSelectedBlock(block);
    setIsModalOpen(true);
  };

  // Fermer la modale
  const handleCloseModal = () => {
    setSelectedBlock(null);
    setIsModalOpen(false);
  };

  // Gérer l'enregistrement (Ajout ou Modification)
  const handleSaveBlock = async (blockData) => {
    if (selectedBlock) {
      // Modification
      await updateTimeBlock(selectedBlock.id, blockData);
    } else {
      // Ajout (avec récurrence hebdomadaire éventuelle sur les jours sélectionnés)
      const { repeatWeekly, repeatWeeksCount, selectedDays, ...data } = blockData;
      
      if (repeatWeekly && selectedDays && selectedDays.length > 0 && repeatWeeksCount > 0) {
        const endDateStr = shiftDate(selectedDate, repeatWeeksCount * 7);
        let d = 0;
        let tempDateStr = selectedDate;
        while (true) {
          const [y, m, dayVal] = tempDateStr.split("-").map(Number);
          const dayOfWeek = new Date(y, m - 1, dayVal).getDay();
          
          if (selectedDays.includes(dayOfWeek)) {
            await addTimeBlock(data, tempDateStr);
          }
          
          if (tempDateStr === endDateStr) {
            break;
          }
          d++;
          tempDateStr = shiftDate(selectedDate, d);
        }
      } else {
        // Ajout classique sans récurrence
        await addTimeBlock(data);
      }
    }
  };

  // Gérer la suppression
  const handleDeleteBlock = async (blockId) => {
    await deleteTimeBlock(blockId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/20 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20 font-sans text-slate-800 dark:text-slate-100 pb-16 relative transition-colors duration-300">
      
      {/* 1. Header Simple et Épuré */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogout={onLogout}
        permission={permission}
        requestPermission={requestPermission}
        activeTab={activeTab}
        onNavigate={setActiveTab}
      />

      {/* 2. Contenu Principal */}
      <main className="mx-auto px-4 py-8 max-w-4xl space-y-6">
        {activeTab === "profile" ? (
          <ProfileSettings
            user={user}
            refreshUser={refreshUser}
            onBack={() => setActiveTab("planning")}
          />
        ) : (
          <>
            {/* Traqueurs Longue Durée */}
            <LongTermTrackers userId={user.uid} onEditBlock={handleOpenEditModal} />
            
            {/* Grille du haut : Entête, DateSelector & Widget Météo iOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              <div className="md:col-span-2 flex flex-col gap-6">
                {/* Section Entête de la journée */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-300 flex-1">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                      {t("dashboard.myDay")}
                    </h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                      {loading ? "..." : t("dashboard.tasksCount", { count: timeBlocks.length })}
                    </p>
                  </div>

                  {/* Bouton d'ajout principal */}
                  <button
                    onClick={handleOpenAddModal}
                    type="button"
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-indigo-600/10 dark:shadow-indigo-500/20 hover:shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>{t("dashboard.addTask")}</span>
                  </button>
                </div>

                {/* Sélecteur de date (DateSelector) */}
                <DateSelector
                  selectedDate={selectedDate}
                  onChangeDate={setSelectedDate}
                />
              </div>
              
              <div className="md:col-span-1">
                <AdvancedWeatherWidget />
              </div>
            </div>

            {/* Navigation par onglets (Tabs) en pilule */}
            <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-2xl w-full max-w-[280px] mx-auto shadow-inner border border-slate-100/50 dark:border-slate-700/50 transition-colors duration-300">
              <button
                onClick={() => setActiveTab("planning")}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer text-center ${
                  activeTab === "planning"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {t("dashboard.planningTab")}
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer text-center ${
                  activeTab === "stats"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {t("dashboard.statsTab")}
              </button>
            </div>

            {/* Gestion des erreurs Firestore */}
            {error && (
              <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350 rounded-2xl p-4 text-sm animate-fade-in">
                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-bold">Erreur de chargement base de données :</span>
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                    Veuillez rafraîchir la page ou vérifier vos permissions Firestore.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Ligne de Temps (DailyTimeline) ou Statistiques */}
            {activeTab === "planning" ? (
              loading ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[300px] transition-colors duration-300">
                  <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">Synchronisation avec Firestore...</span>
                </div>
              ) : (
                <DailyTimeline
                  timeBlocks={timeBlocks}
                  onEditBlock={handleOpenEditModal}
                  onUpdateBlock={updateTimeBlock}
                />
              )
            ) : (
              <StatisticsDashboard user={user} selectedDate={selectedDate} />
            )}
          </>
        )}
      </main>

      {/* 5. Bouton Flottant mobile-first (Ajout rapide de tâche) */}
      {activeTab !== "profile" && (
        <button
          onClick={handleOpenAddModal}
          type="button"
          className="fixed bottom-6 right-6 z-30 sm:hidden bg-indigo-600 hover:bg-indigo-700 text-white p-4.5 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Ajouter une tâche"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      )}

      {/* 6. Modale d'ajout / modification de bloc de temps */}
      <BlockFormModal
        key={selectedBlock ? `edit-${selectedBlock.id}` : `add-new-block-${selectedDate}`}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        block={selectedBlock}
        selectedDate={selectedDate}
      />
    </div>
  );
}

export default Dashboard;
