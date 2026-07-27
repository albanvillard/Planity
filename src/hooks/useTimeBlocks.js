import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Hook personnalisé useTimeBlocks pour gérer les blocs de temps d'un utilisateur dans Firestore,
 * filtrés par date sélectionnée.
 * Récupère les données en temps réel et expose les fonctions CRUD.
 * 
 * @param {string} userId L'identifiant de l'utilisateur connecté.
 * @param {string} selectedDate La date sélectionnée au format "YYYY-MM-DD".
 */
export function useTimeBlocks(userId, selectedDate) {
  const [timeBlocks, setTimeBlocks] = useState([]);
  
  // États de chargement et d'erreur
  const [prevUserId, setPrevUserId] = useState(userId);
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState(null);

  // Ajustement d'état synchrone lors de la modification de props (userId ou date)
  // pour éviter d'induire des cascades de render via des useEffect
  if (userId !== prevUserId || selectedDate !== prevSelectedDate) {
    setPrevUserId(userId);
    setPrevSelectedDate(selectedDate);
    setLoading(!!userId);
    setError(null);
  }

  // Synchronisation en temps réel avec Firestore
  useEffect(() => {
    if (!userId || !selectedDate) {
      return;
    }

    // Requête filtrée par l'identifiant de l'utilisateur ET par dateString pour la sécurité et la pertinence
    const q = query(
      collection(db, "time_blocks"),
      where("userId", "==", userId),
      where("dateString", "==", selectedDate)
    );

    // Écouteur en temps réel Firestore
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const blocks = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.isLongTerm) {
            blocks.push({
              id: docSnapshot.id,
              ...data
            });
          }
        });

        // Tri local par heure de début pour éviter l'obligation d'avoir un index composite sur Firestore
        blocks.sort((a, b) => {
          if (a.startTime && b.startTime) {
            return a.startTime.localeCompare(b.startTime);
          }
          return 0;
        });

        setTimeBlocks(blocks);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur onSnapshot Firestore :", err);
        setError(err);
        setLoading(false);
      }
    );

    // Nettoyage de l'abonnement
    return () => unsubscribe();
  }, [userId, selectedDate]);

  // Ajouter un bloc de temps associé à la date sélectionnée
  const addTimeBlock = useCallback(
    async (blockData, customDate) => {
      if (!userId) throw new Error("Utilisateur non connecté.");
      try {
        const docRef = await addDoc(collection(db, "time_blocks"), {
          ...blockData,
          userId,
          dateString: customDate || selectedDate, // Enregistre la tâche pour la date sélectionnée ou spécifique
          createdAt: new Date().toISOString()
        });
        return docRef.id;
      } catch (err) {
        console.error("Erreur lors de l'ajout du bloc :", err);
        throw err;
      }
    },
    [userId, selectedDate]
  );

  // Mettre à jour un bloc de temps
  const updateTimeBlock = useCallback(
    async (blockId, blockData) => {
      if (!userId) throw new Error("Utilisateur non connecté.");
      try {
        const docRef = doc(db, "time_blocks", blockId);
        await updateDoc(docRef, {
          ...blockData,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Erreur lors de la modification du bloc :", err);
        throw err;
      }
    },
    [userId]
  );

  // Supprimer un bloc de temps
  const deleteTimeBlock = useCallback(
    async (blockId) => {
      if (!userId) throw new Error("Utilisateur non connecté.");
      try {
        const docRef = doc(db, "time_blocks", blockId);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Erreur lors de la suppression du bloc :", err);
        throw err;
      }
    },
    [userId]
  );

  return {
    timeBlocks,
    loading,
    error,
    addTimeBlock,
    updateTimeBlock,
    deleteTimeBlock
  };
}

export default useTimeBlocks;
