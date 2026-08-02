import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Composant GroupsManager - Gère l'affichage des groupes de vacances de l'utilisateur
 * et la création de nouveaux groupes de partage de dépenses.
 * 
 * @param {object} props
 * @param {object} props.user - L'utilisateur Firebase Auth actuellement connecté
 * @param {function} props.onSelectGroup - Callback déclenché au clic sur un groupe pour afficher ses détails
 */
export function GroupsManager({ user, onSelectGroup }) {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // 1. Écouter en temps réel les groupes dont l'utilisateur connecté fait partie
  useEffect(() => {
    setLoading(true);
    setError(null);

    const groupsQuery = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const groupsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        // Trier localement par date de création (les plus récents en premier)
        groupsList.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setGroups(groupsList);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur lors du chargement des groupes :", err);
        setError("Impossible de charger vos groupes de vacances.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // 2. Gérer la création d'un nouveau groupe
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;

    setCreating(true);
    setError(null);

    try {
      await addDoc(collection(db, "groups"), {
        name: trimmedName,
        members: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setNewGroupName("");
    } catch (err) {
      console.error("Erreur lors de la création du groupe :", err);
      setError("Erreur lors de la création du groupe. Veuillez réessayer.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in duration-200 px-1 sm:px-0">
      {/* Entête du module Vacances */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/20 dark:via-purple-500/25 dark:to-pink-500/20 rounded-3xl p-6 border border-indigo-100/50 dark:border-indigo-900/40 shadow-sm relative overflow-hidden">
        {/* Cercles de décorations en arrière-plan */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />

        <div className="relative flex items-start gap-4">
          <span className="w-12 h-12 rounded-2xl bg-indigo-600 dark:bg-indigo-550 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 text-2xl">
            ✈️
          </span>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Mes Vacances & Dépenses
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Gérez vos vacances de groupe et calculez facilement les équilibres de dépenses partagées (Tricount).
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire de création de groupe */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <span className="text-lg">➕</span> Créer un nouveau groupe
        </h3>
        
        <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Ex : Road Trip Minorque 2026, Ski Chamonix..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            disabled={creating}
            className="flex-grow px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all duration-200 text-sm shadow-inner"
          />
          <button
            type="submit"
            disabled={creating || !newGroupName.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm shrink-0"
          >
            {creating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Création...
              </>
            ) : (
              "Créer le groupe"
            )}
          </button>
        </form>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350 rounded-2xl p-4 text-sm animate-fade-in">
          <span className="text-lg">⚠️</span>
          <div>
            <span className="font-bold">Erreur :</span>
            <p className="text-xs text-rose-600 dark:text-rose-455 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Liste des groupes existants */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between px-1">
          <span>Mes Groupes ({groups.length})</span>
        </h3>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col items-center justify-center min-h-[200px] transition-colors duration-300">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Chargement de vos groupes...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <p className="text-base font-black text-slate-700 dark:text-slate-350">Vous ne faites partie d'aucun groupe</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-sm mx-auto">
              Saisissez un nom ci-dessus pour créer votre premier groupe de vacances et y inviter vos compagnons de voyage !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                type="button"
                className="w-full text-left p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm group flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 w-full">
                    {/* Badge de style valise / voyage */}
                    <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform duration-200">
                      🏖️
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-bold shadow-inner">
                      {group.members?.length || 1} membre{group.members?.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-455 line-clamp-1 transition-colors duration-250">
                    {group.name}
                  </h4>
                </div>

                <div className="flex items-center justify-between w-full mt-4 pt-3 border-t border-slate-50 dark:border-slate-805">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Ouvrir les comptes
                  </span>
                  {/* Flèche interactive */}
                  <svg className="w-5 h-5 text-slate-455 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupsManager;
