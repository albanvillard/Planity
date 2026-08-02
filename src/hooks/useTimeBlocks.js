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
import { db, auth } from "../firebase.js";

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

    // Requête 1: Tâches créées par l'utilisateur (rétrocompatibilité pour les blocs sans sharedWith)
    const q1 = query(
      collection(db, "time_blocks"),
      where("userId", "==", userId),
      where("dateString", "==", selectedDate)
    );

    // Requête 2: Tâches partagées avec l'utilisateur
    const q2 = query(
      collection(db, "time_blocks"),
      where("sharedWith", "array-contains", userId),
      where("dateString", "==", selectedDate)
    );

    let blocks1 = [];
    let blocks2 = [];

    const handleUpdate = () => {
      const merged = [...blocks1, ...blocks2];

      // Déduplication des blocs par ID
      const uniqueBlocks = [];
      const seenIds = new Set();

      for (const block of merged) {
        if (!seenIds.has(block.id)) {
          seenIds.add(block.id);
          uniqueBlocks.push(block);
        }
      }

      // Tri local par heure de début pour éviter l'obligation d'avoir un index composite sur Firestore
      uniqueBlocks.sort((a, b) => {
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });

      setTimeBlocks(uniqueBlocks);
      setLoading(false);
    };

    // Écouteur en temps réel pour q1 (créateur)
    const unsubscribe1 = onSnapshot(
      q1,
      (querySnapshot) => {
        const list = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.isLongTerm) {
            list.push({
              id: docSnapshot.id,
              ...data
            });
          }
        });
        blocks1 = list;
        handleUpdate();
      },
      (err) => {
        console.error("Erreur onSnapshot q1 :", err);
        setError(err);
        setLoading(false);
      }
    );

    // Écouteur en temps réel pour q2 (partagé avec)
    const unsubscribe2 = onSnapshot(
      q2,
      (querySnapshot) => {
        const list = [];
        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (!data.isLongTerm) {
            list.push({
              id: docSnapshot.id,
              ...data
            });
          }
        });
        blocks2 = list;
        handleUpdate();
      },
      (err) => {
        console.error("Erreur onSnapshot q2 :", err);
        setError(err);
        setLoading(false);
      }
    );

    // Nettoyage des abonnements
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [userId, selectedDate]);

  // Ajouter un bloc de temps associé à la date sélectionnée
  const addTimeBlock = useCallback(
    async (blockData, customDate) => {
      if (!userId) throw new Error("Utilisateur non connecté.");
      try {
        // Garantir que sharedWith contient au moins le créateur, même s'il n'est pas fourni dans blockData
        const sharedWith = blockData.sharedWith && blockData.sharedWith.length > 0
          ? [...new Set([userId, ...blockData.sharedWith])]
          : [userId];

        const creatorId = userId;
        const creatorUsername = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Inconnu";

        const docRef = await addDoc(collection(db, "time_blocks"), {
          ...blockData,
          sharedWith,
          userId,
          creatorId,
          creatorUsername,
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

        let dataToUpdate = { ...blockData };
        if (blockData.sharedWith) {
          dataToUpdate.sharedWith = [...new Set([userId, ...blockData.sharedWith])];
        }

        await updateDoc(docRef, {
          ...dataToUpdate,
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
