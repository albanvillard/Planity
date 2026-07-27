import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { getTodayDateString } from "../utils/date.js";

/**
 * Hook personnalisé pour gérer l'autorisation des notifications et planifier
 * les alertes locales 15 minutes avant le début d'une tâche d'aujourd'hui.
 *
 * @param {string} userId - L'identifiant de l'utilisateur connecté.
 */
export function useNotifications(userId) {
  // État de l'autorisation des notifications
  const [permission, setPermission] = useState(() => {
    return typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default";
  });

  // Liste des blocs de temps planifiés pour aujourd'hui
  const [todayBlocks, setTodayBlocks] = useState([]);
  
  // Ensemble pour suivre les clés de notifications déjà envoyées afin d'éviter les doublons.
  // La clé combine l'ID du bloc et son heure de début (ex: "blockId-10:30")
  const notifiedBlocksRef = useRef(new Set());

  // 1. Écoute en temps réel des blocs de temps de l'utilisateur pour aujourd'hui
  useEffect(() => {
    if (!userId) {
      return;
    }

    const todayStr = getTodayDateString();
    const q = query(
      collection(db, "time_blocks"),
      where("userId", "==", userId),
      where("dateString", "==", todayStr)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const blocks = [];
        querySnapshot.forEach((docSnapshot) => {
          blocks.push({
            id: docSnapshot.id,
            ...docSnapshot.data()
          });
        });
        setTodayBlocks(blocks);
      },
      (err) => {
        console.error("Erreur notifications onSnapshot :", err);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 2. Demande d'autorisation pour afficher les notifications
  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "default";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.error("Erreur lors de la demande de permission de notification :", err);
      return "default";
    }
  };

  // 3. Logique d'alerte locale périodique (setInterval)
  useEffect(() => {
    // Si l'autorisation n'est pas accordée ou qu'il n'y a pas de blocs de temps, ne rien faire
    if (permission !== "granted" || todayBlocks.length === 0) {
      return;
    }

    const verifierTachesProches = () => {
      const maintenant = new Date();
      const minutesActuelles = maintenant.getHours() * 60 + maintenant.getMinutes();

      todayBlocks.forEach((block) => {
        if (!block.startTime || !block.title) {
          return;
        }

        // Extraction de l'heure et des minutes du début du bloc
        const [heureDebut, minutesDebut] = block.startTime.split(":").map(Number);
        const minutesBloc = heureDebut * 60 + minutesDebut;
        
        // Calcul de la différence en minutes
        const difference = minutesBloc - minutesActuelles;

        // Si l'heure actuelle correspond exactement à 15 minutes avant le début
        if (difference === 15) {
          const cleNotification = `${block.id}-${block.startTime}`;
          
          if (!notifiedBlocksRef.current.has(cleNotification)) {
            notifiedBlocksRef.current.add(cleNotification);

            const titreNotification = block.title;
            const optionsNotification = {
              body: "Début dans 15 minutes !",
              icon: "/icon-192x192.png",
              tag: block.id // Évite les doublons système
            };

            // Tentative d'affichage via le Service Worker (optimal pour PWA)
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
              navigator.serviceWorker.ready
                .then((registration) => {
                  registration.showNotification(titreNotification, optionsNotification);
                })
                .catch((err) => {
                  console.warn("Échec de la notification via Service Worker, repli sur Notification standard :", err);
                  new Notification(titreNotification, optionsNotification);
                });
            } else {
              // Notification classique en cas d'absence de Service Worker
              new Notification(titreNotification, optionsNotification);
            }
          }
        }
      });
    };

    // Lancer une première vérification au chargement
    verifierTachesProches();

    // Répéter la vérification toutes les 30 secondes pour garantir qu'on ne rate pas le créneau
    const intervalId = setInterval(verifierTachesProches, 30000);

    return () => clearInterval(intervalId);
  }, [todayBlocks, permission]);

  return {
    permission,
    requestPermission
  };
}

export default useNotifications;
