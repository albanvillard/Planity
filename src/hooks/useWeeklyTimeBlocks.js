import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { getWeekRange } from "../utils/date.js";

/**
 * Hook personnalisé pour écouter en temps réel tous les blocs d'un utilisateur,
 * filtrés en mémoire sur la semaine de la date sélectionnée.
 * 
 * @param {string} userId Identifiant de l'utilisateur.
 * @param {string} selectedDate Date de référence ("YYYY-MM-DD").
 */
export function useWeeklyTimeBlocks(userId, selectedDate) {
  const [weeklyBlocks, setWeeklyBlocks] = useState([]);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !selectedDate) {
      return;
    }

    const { start, end } = getWeekRange(selectedDate);

    // Écouteur sur tous les blocs de l'utilisateur pour éviter le besoin d'index composite
    const q = query(
      collection(db, "time_blocks"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const blocks = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          // Filtrer en mémoire sur l'intervalle de la semaine [start, end]
          if (data.dateString && data.dateString >= start && data.dateString <= end && !data.isLongTerm) {
            blocks.push({
              id: docSnapshot.id,
              ...data
            });
          }
        });

        // Tri chronologique local par dateString puis par startTime
        blocks.sort((a, b) => {
          const dateComp = a.dateString.localeCompare(b.dateString);
          if (dateComp !== 0) return dateComp;
          if (a.startTime && b.startTime) {
            return a.startTime.localeCompare(b.startTime);
          }
          return 0;
        });

        setWeeklyBlocks(blocks);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur onSnapshot Firestore (weekly) :", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, selectedDate]);

  return { weeklyBlocks, loading, error };
}

export default useWeeklyTimeBlocks;
