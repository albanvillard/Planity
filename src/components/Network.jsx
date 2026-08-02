import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Composant de gestion du Réseau Social avec Annuaire Global des membres.
 * 
 * @param {object} props
 * @param {object} props.user L'utilisateur Firebase Auth actuellement connecté
 * @param {function} props.onBack Callback pour retourner au planning principal
 */
export function Network({ user, onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [directoryError, setDirectoryError] = useState(null);
  
  // États de chargement et messages de retour
  const [actionLoading, setActionLoading] = useState({});
  const [actionMessage, setActionMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // 1. Charger tous les utilisateurs de l'application (Annuaire) à l'initialisation
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingDirectory(true);
        setDirectoryError(null);
        
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList = querySnapshot.docs
          .map((doc) => ({
            uid: doc.id,
            ...doc.data()
          }))
          .filter((u) => u.uid !== user.uid); // Exclure l'utilisateur connecté

        setAllUsers(usersList);
      } catch (err) {
        console.error("Erreur lors de la récupération des utilisateurs :", err);
        setDirectoryError("Impossible de charger l'annuaire des membres.");
      } finally {
        setLoadingDirectory(false);
      }
    };

    fetchUsers();
  }, [user.uid]);

  // 2. Écouter en temps réel TOUTES les relations d'amitié impliquant l'utilisateur connecté
  useEffect(() => {
    const q1 = collection(db, "friendships");
    
    // Nous écoutons en temps réel pour synchroniser les changements instantanément
    const unsubscribe = onSnapshot(
      q1,
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
          // Filtrer localement pour obtenir uniquement les amitiés de l'utilisateur courant
          .filter((f) => f.senderId === user.uid || f.receiverId === user.uid);

        setFriendships(list);
      },
      (err) => {
        console.error("Erreur lors de l'écoute des relations d'amitié :", err);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // 3. Dériver l'état : Liste des invitations reçues et en attente
  const pendingRequests = useMemo(() => {
    return friendships.filter(
      (f) => f.receiverId === user.uid && f.status === "pending"
    );
  }, [friendships, user.uid]);

  // 4. Dériver l'état : Liste des amis acceptés
  const friends = useMemo(() => {
    return friendships
      .filter((f) => f.status === "accepted")
      .map((f) => {
        const isSender = f.senderId === user.uid;
        return {
          friendshipDocId: f.id,
          uid: isSender ? f.receiverId : f.senderId,
          username: isSender ? f.receiverUsername : f.senderUsername,
          photoURL: isSender ? (f.receiverPhotoURL || null) : (f.senderPhotoURL || null),
          createdAt: f.createdAt
        };
      });
  }, [friendships, user.uid]);

  // 5. Filtrer localement l'annuaire selon la recherche
  const filteredUsers = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return allUsers;
    return allUsers.filter((u) =>
      u.username?.toLowerCase().includes(queryStr)
    );
  }, [allUsers, searchQuery]);

  // Récupérer le statut actuel de la relation pour un utilisateur donné
  const getRelationInfo = (targetUid) => {
    const rel = friendships.find(
      (f) => (f.senderId === user.uid && f.receiverId === targetUid) ||
             (f.senderId === targetUid && f.receiverId === user.uid)
    );

    if (!rel) return { status: "none", id: null };
    if (rel.status === "accepted") return { status: "accepted", id: rel.id };
    if (rel.senderId === user.uid) return { status: "pending_sent", id: rel.id };
    return { status: "pending_received", id: rel.id };
  };

  // Action : Envoyer une invitation d'amitié
  const handleSendRequest = async (targetUser) => {
    setActionLoading((prev) => ({ ...prev, [targetUser.uid]: true }));
    setActionMessage(null);

    try {
      // Récupérer les informations les plus fraîches de l'expéditeur
      let senderUsername = user.displayName || user.email.split("@")[0];
      let senderPhotoURL = user.photoURL || null;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const p = userDocSnap.data();
        senderUsername = p.username || senderUsername;
        senderPhotoURL = p.photoURL || senderPhotoURL;
      }

      const newFriendship = {
        senderId: user.uid,
        senderUsername,
        senderPhotoURL,
        receiverId: targetUser.uid,
        receiverUsername: targetUser.username,
        receiverPhotoURL: targetUser.photoURL || null,
        status: "pending",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "friendships"), newFriendship);

      setActionMessage({
        type: "success",
        text: `Demande d'amitié envoyée à ${targetUser.username} !`
      });
    } catch (err) {
      console.error("Erreur lors de l'envoi de la demande :", err);
      setActionMessage({
        type: "error",
        text: "Impossible d'envoyer la demande d'amitié."
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUser.uid]: false }));
    }
  };

  // Action : Accepter une demande d'amitié
  const handleAcceptRequest = async (requestId, friendName) => {
    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    setActionMessage(null);

    try {
      const docRef = doc(db, "friendships", requestId);
      await updateDoc(docRef, {
        status: "accepted"
      });

      setActionMessage({
        type: "success",
        text: `Vous êtes désormais ami avec ${friendName} !`
      });
    } catch (err) {
      console.error("Erreur lors de l'acceptation :", err);
      setActionMessage({
        type: "error",
        text: "Impossible d'accepter la demande."
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Action : Supprimer / Annuler / Décliner une relation
  const handleDeleteRelation = async (requestId, friendName, type) => {
    const confirmMsg = 
      type === "unfriend" 
        ? `Êtes-vous sûr de vouloir retirer ${friendName} de vos amis ?`
        : type === "cancel"
        ? `Annuler votre invitation envoyée à ${friendName} ?`
        : null;

    if (confirmMsg && !window.confirm(confirmMsg)) return;

    setActionLoading((prev) => ({ ...prev, [requestId]: true }));
    setActionMessage(null);

    try {
      await deleteDoc(doc(db, "friendships", requestId));

      let successText = "Invitation déclinée.";
      if (type === "unfriend") successText = `${friendName} a été retiré de vos amis.`;
      if (type === "cancel") successText = "Invitation annulée.";

      setActionMessage({
        type: "success",
        text: successText
      });
    } catch (err) {
      console.error("Erreur lors de la suppression de la relation :", err);
      setActionMessage({
        type: "error",
        text: "Une erreur est survenue. Veuillez réessayer."
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in duration-305">
      {/* Bouton Retour */}
      <button
        onClick={onBack}
        type="button"
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold transition-colors duration-200 cursor-pointer text-sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Retour au Planning</span>
      </button>

      {/* Titre Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          Mon Réseau
        </h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
          Découvrez l'annuaire des membres de Planity, connectez-vous et gérez vos amis en temps réel.
        </p>
      </div>

      {/* Alertes d'actions */}
      {actionMessage && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm animate-fade-in border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-350"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350"
          }`}
        >
          {actionMessage.type === "success" ? (
            <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div className="font-semibold">{actionMessage.text}</div>
        </div>
      )}

      {/* Grid d'affichage principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Colonnes 1 & 2 : Annuaire des membres + Invitations reçues */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section : Annuaire des membres */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Annuaire des membres
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Découvrez et connectez-vous avec les autres membres inscrits.
                </p>
              </div>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold px-3 py-1 rounded-full self-start sm:self-auto shadow-inner">
                {allUsers.length} inscrit{allUsers.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Barre de recherche locale */}
            <div className="relative mb-6">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Rechercher un membre par pseudo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all duration-200 text-sm shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Liste de l'annuaire */}
            {loadingDirectory ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-indigo-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  Chargement des membres de Planity...
                </p>
              </div>
            ) : directoryError ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350 rounded-2xl text-xs font-semibold">
                {directoryError}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-105 dark:border-slate-800 rounded-2xl">
                <p className="text-sm font-semibold">Aucun membre trouvé</p>
                <p className="text-xs mt-1">Aucun utilisateur ne correspond à votre recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
                {filteredUsers.map((member) => {
                  const relation = getRelationInfo(member.uid);
                  const isActionLoading = actionLoading[member.uid] || (relation.id && actionLoading[relation.id]);
                  
                  return (
                    <div
                      key={member.uid}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-205 dark:hover:border-slate-700 transition-all duration-200 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.username}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200/50 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner shrink-0 border border-indigo-100/50 dark:border-slate-800">
                            {member.username ? member.username.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                        
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 truncate">
                            {member.username}
                          </h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            Membre
                          </p>
                        </div>
                      </div>

                      {/* Bouton d'action adaptatif */}
                      <div className="shrink-0">
                        {relation.status === "none" && (
                          <button
                            onClick={() => handleSendRequest(member)}
                            disabled={isActionLoading}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Ajouter
                          </button>
                        )}

                        {relation.status === "pending_sent" && (
                          <button
                            onClick={() => handleDeleteRelation(relation.id, member.username, "cancel")}
                            disabled={isActionLoading}
                            className="bg-slate-200/80 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/20 text-slate-650 dark:text-slate-400 font-bold px-3 py-2 rounded-xl text-xs transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            title="Annuler l'invitation"
                          >
                            {isActionLoading ? "..." : "Invité"}
                          </button>
                        )}

                        {relation.status === "pending_received" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleAcceptRequest(relation.id, member.username)}
                              disabled={isActionLoading}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => handleDeleteRelation(relation.id, member.username, "refuse")}
                              disabled={isActionLoading}
                              className="bg-slate-200 hover:bg-rose-600 hover:text-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all duration-200 cursor-pointer"
                            >
                              Refuser
                            </button>
                          </div>
                        )}

                        {relation.status === "accepted" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-200/20 shadow-sm">
                            <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Ami
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section : Demandes d'amitié en attente de réponse (Invitations reçues) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Invitations reçues
              </span>
              {pendingRequests.length > 0 && (
                <span className="text-xs bg-indigo-500 text-white font-black px-2.5 py-1 rounded-full animate-pulse shadow-md">
                  {pendingRequests.length}
                </span>
              )}
            </h3>

            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <p className="text-sm font-semibold">Aucune demande en attente</p>
                <p className="text-xs mt-1">Vous n'avez pas de demandes de connexion pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      {req.senderPhotoURL ? (
                        <img
                          src={req.senderPhotoURL}
                          alt={req.senderUsername}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold shadow-inner">
                          {req.senderUsername ? req.senderUsername.charAt(0).toUpperCase() : "?"}
                        </div>
                      )}
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                          {req.senderUsername}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Souhaite se connecter avec vous
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.senderUsername)}
                        disabled={actionLoading[req.id]}
                        className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleDeleteRelation(req.id, req.senderUsername, "refuse")}
                        disabled={actionLoading[req.id]}
                        className="flex-1 sm:flex-initial bg-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/20 text-slate-600 dark:text-slate-400 font-bold px-4 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer flex items-center justify-center"
                      >
                        Décliner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne 3 : Liste des amis */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Mes Amis
            </span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black px-2.5 py-1 rounded-full shadow-inner">
              {friends.length}
            </span>
          </h3>

          {friends.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
              <p className="text-sm font-semibold">Aucun ami pour le moment</p>
              <p className="text-xs mt-1">Envoyez des invitations depuis l'annuaire pour vous faire des amis.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {friends.map((friend) => (
                <div
                  key={friend.uid}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/25 hover:bg-slate-100/30 dark:hover:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/40 flex items-center justify-between gap-3 transition-colors duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar */}
                    {friend.photoURL ? (
                      <img
                        src={friend.photoURL}
                        alt={friend.username}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200/50 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                        {friend.username ? friend.username.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate block">
                        {friend.username}
                      </span>
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                        Ami connecté
                      </p>
                    </div>
                  </div>

                  {/* Bouton unfriend */}
                  <button
                    onClick={() => handleDeleteRelation(friend.friendshipDocId, friend.username, "unfriend")}
                    disabled={actionLoading[friend.friendshipDocId]}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 cursor-pointer shrink-0"
                    title="Retirer de mes amis"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h4m-6-3a3 3 0 01-3-3V1m-4 4h12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Network;
