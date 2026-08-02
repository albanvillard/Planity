import { useState, useEffect, useMemo } from "react";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Composant GroupDetails - Coeur du module Vacances / Tricount.
 * Permet de gérer les membres d'un groupe, d'ajouter des dépenses partagées, 
 * de visualiser la balance de chacun et de supprimer des dépenses.
 * 
 * @param {object} props
 * @param {string} props.groupId - L'ID du groupe Firestore à afficher
 * @param {object} props.user - L'utilisateur Firebase Auth actuellement connecté
 * @param {function} props.onBack - Callback pour retourner à la liste des groupes
 */
export function GroupDetails({ groupId, user, onBack }) {
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [friends, setFriends] = useState([]);
  
  // États de chargement et d'erreurs
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [error, setError] = useState(null);
  
  // États des formulaires
  const [manualUid, setManualUid] = useState("");
  const [selectedFriendUid, setSelectedFriendUid] = useState("");
  
  // Formulaire de dépense
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [expenseConcerned, setExpenseConcerned] = useState([]); // Tableau d'UIDs
  const [formError, setFormError] = useState(null);
  const [addingExpense, setAddingExpense] = useState(false);

  // 1. Écouter le groupe sélectionné en temps réel
  useEffect(() => {
    setLoadingGroup(true);
    const groupRef = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(
      groupRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const groupData = docSnap.data();
          setGroup({ id: docSnap.id, ...groupData });
          
          // Définir par défaut le payeur de la dépense sur l'utilisateur connecté s'il est membre
          if (groupData.members?.includes(user.uid)) {
            setExpensePaidBy(user.uid);
          } else if (groupData.members?.length > 0) {
            setExpensePaidBy(groupData.members[0]);
          }
          
          // Initialiser les personnes concernées avec tous les membres du groupe
          setExpenseConcerned(groupData.members || []);
        } else {
          setError("Ce groupe n'existe pas ou a été supprimé.");
        }
        setLoadingGroup(false);
      },
      (err) => {
        console.error("Erreur lors de l'écoute du groupe :", err);
        setError("Erreur de chargement du groupe.");
        setLoadingGroup(false);
      }
    );
    return () => unsubscribe();
  }, [groupId, user.uid]);

  // 2. Écouter TOUS les utilisateurs pour résoudre les pseudos en temps réel
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const uMap = {};
        snapshot.docs.forEach((doc) => {
          uMap[doc.id] = {
            uid: doc.id,
            ...doc.data()
          };
        });
        setUsersMap(uMap);
      },
      (err) => {
        console.error("Erreur lors du chargement des utilisateurs :", err);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Écouter les relations d'amitié acceptées de l'utilisateur pour sélection rapide
  useEffect(() => {
    const q = query(
      collection(db, "friendships"),
      where("status", "==", "accepted")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const friendsList = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          // Filtrer localement les amitiés impliquant l'utilisateur
          .filter((f) => f.senderId === user.uid || f.receiverId === user.uid)
          .map((f) => {
            const isSender = f.senderId === user.uid;
            return {
              uid: isSender ? f.receiverId : f.senderId,
              username: isSender ? f.receiverUsername : f.senderUsername,
              photoURL: isSender ? f.receiverPhotoURL : f.senderPhotoURL
            };
          });
        setFriends(friendsList);
      },
      (err) => {
        console.error("Erreur lors du chargement des amis :", err);
      }
    );
    return () => unsubscribe();
  }, [user.uid]);

  // 4. Écouter les dépenses de ce groupe en temps réel
  useEffect(() => {
    setLoadingExpenses(true);
    const expensesQuery = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId)
    );

    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expensesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        // Trier localement par date (du plus récent au plus ancien)
        expensesList.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setExpenses(expensesList);
        setLoadingExpenses(false);
      },
      (err) => {
        console.error("Erreur lors de l'écoute des dépenses :", err);
        setLoadingExpenses(false);
      }
    );
    return () => unsubscribe();
  }, [groupId]);

  // 5. Gérer l'ajout d'un membre (via UID ou sélection d'ami)
  const handleAddMember = async (memberUid) => {
    const trimmedUid = memberUid?.trim();
    if (!trimmedUid) return;

    if (group.members?.includes(trimmedUid)) {
      alert("Cet utilisateur fait déjà partie du groupe !");
      return;
    }

    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(trimmedUid)
      });
      // Réinitialiser les champs
      setManualUid("");
      setSelectedFriendUid("");
      
      // Ajouter automatiquement le nouveau membre dans les concernés par défaut
      setExpenseConcerned((prev) => [...prev, trimmedUid]);
    } catch (err) {
      console.error("Erreur lors de l'ajout du membre :", err);
      alert("Impossible d'ajouter le membre. Vérifiez les permissions.");
    }
  };

  // Gérer le retrait d'un membre du groupe
  const handleRemoveMember = async (memberId) => {
    if (memberId === user.uid) return;
    
    const name = usersMap[memberId]?.username || memberId.substring(0, 8);
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer ${name} de ce groupe ?`)) return;

    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayRemove(memberId)
      });

      // Retirer des personnes concernées par la dépense en cours de saisie
      setExpenseConcerned((prev) => prev.filter((id) => id !== memberId));
    } catch (err) {
      console.error("Erreur lors du retrait du membre :", err);
      alert("Impossible de retirer le membre. Vérifiez vos permissions.");
    }
  };

  // 6. Gérer l'enregistrement d'une dépense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(expenseAmount);
    if (!expenseTitle.trim()) {
      setFormError("Le titre de la dépense est requis.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError("Veuillez saisir un montant supérieur à 0.");
      return;
    }
    if (!expensePaidBy) {
      setFormError("Veuillez indiquer qui a payé.");
      return;
    }
    if (expenseConcerned.length === 0) {
      setFormError("Au moins un membre doit être concerné par la dépense.");
      return;
    }

    setAddingExpense(true);

    try {
      await addDoc(collection(db, "expenses"), {
        groupId,
        title: expenseTitle.trim(),
        amount: amountNum,
        paidBy: expensePaidBy,
        concerned: expenseConcerned,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });

      // Réinitialiser le formulaire
      setExpenseTitle("");
      setExpenseAmount("");
      setExpensePaidBy(user.uid);
      setExpenseConcerned(group?.members || []);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de la dépense :", err);
      setFormError("Erreur lors de la sauvegarde de la dépense.");
    } finally {
      setAddingExpense(false);
    }
  };

  // Gérer la suppression d'une dépense
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;
    try {
      await deleteDoc(doc(db, "expenses", expenseId));
    } catch (err) {
      console.error("Erreur lors de la suppression de la dépense :", err);
      alert("Impossible de supprimer la dépense.");
    }
  };

  // Basculer une personne concernée
  const handleToggleConcerned = (memberUid) => {
    setExpenseConcerned((prev) =>
      prev.includes(memberUid)
        ? prev.filter((id) => id !== memberUid)
        : [...prev, memberUid]
    );
  };

  // 7. ALGORITHME DE CALCUL DE LA BALANCE (Tricount)
  // Calcule la balance de chaque membre : (Somme de ce qu'il a payé) - (Somme de ce qu'il a consommé)
  const balances = useMemo(() => {
    if (!group || !group.members) return [];

    const balMap = {};
    group.members.forEach((mId) => {
      balMap[mId] = 0;
    });

    expenses.forEach((exp) => {
      const amount = Number(exp.amount) || 0;
      const payer = exp.paidBy;
      const concerned = exp.concerned || [];

      if (concerned.length > 0) {
        const share = amount / concerned.length;

        // Ajouter le montant payé au payeur
        if (balMap[payer] !== undefined) {
          balMap[payer] += amount;
        }

        // Soustraire la part consommée de chacun
        concerned.forEach((uid) => {
          if (balMap[uid] !== undefined) {
            balMap[uid] -= share;
          }
        });
      }
    });

    // Transformer en tableau exploitable et arrondir à 2 décimales
    return group.members.map((memberId) => {
      const rawBalance = balMap[memberId] || 0;
      // Arrondi propre à 2 décimales pour éviter les bugs à virgule flottante
      const finalBalance = Math.round(rawBalance * 100) / 100;
      return {
        uid: memberId,
        username: usersMap[memberId]?.username || memberId.substring(0, 8),
        photoURL: usersMap[memberId]?.photoURL || null,
        balance: finalBalance
      };
    });
  }, [group, expenses, usersMap]);

  if (loadingGroup) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[300px] transition-colors duration-300">
        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">Chargement des détails du groupe...</span>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} type="button" className="flex items-center gap-2 text-slate-550 dark:text-slate-400 font-bold hover:text-indigo-600 transition-colors">
          ⬅️ Retour aux groupes
        </button>
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350 rounded-2xl p-6 text-center">
          <p className="font-bold">{error || "Erreur de chargement."}</p>
        </div>
      </div>
    );
  }

  // Filtrer les amis pour ne proposer que ceux qui ne sont pas déjà membres du groupe
  const nonMemberFriends = friends.filter((f) => !group.members.includes(f.uid));

  return (
    <div className="space-y-6 animate-fade-in duration-200 px-1 sm:px-0">
      
      {/* Bouton Retour & Titre du Groupe */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold transition-colors duration-200 cursor-pointer text-sm self-start"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour aux groupes</span>
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-300">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
              🏝️ Groupe Actif
            </span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-2.5">
              {group.name}
            </h2>
          </div>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold px-3 py-1.5 rounded-full shadow-inner self-start sm:self-auto">
            {group.members?.length || 0} participants
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Colonnes de gauche : Ajouter Dépense + Les Comptes */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 3 : Les Comptes (Algorithme de balance) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-lg">📊</span> Les Comptes
            </h3>

            {balances.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                Aucun membre dans ce groupe.
              </p>
            ) : (
              <div className="space-y-3">
                {balances.map((item) => {
                  const isPositive = item.balance > 0;
                  const isNegative = item.balance < 0;
                  
                  return (
                    <div
                      key={item.uid}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-800/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        {item.photoURL ? (
                          <img
                            src={item.photoURL}
                            alt={item.username}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200/50 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner shrink-0 border border-indigo-100/50 dark:border-slate-800">
                            {item.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 truncate">
                          {item.username} {item.uid === user.uid && "(Moi)"}
                        </span>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span
                          className={`font-black text-sm px-3.5 py-1.5 rounded-xl border inline-block ${
                            isPositive
                              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/20 text-emerald-650 dark:text-emerald-400"
                              : isNegative
                              ? "bg-rose-50 dark:bg-rose-950/20 border-rose-250/20 text-rose-650 dark:text-rose-400"
                              : "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 dark:text-slate-455"
                          }`}
                        >
                          {isPositive ? `+${item.balance.toFixed(2)}` : item.balance.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2 : Ajouter une dépense */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-lg">💸</span> Ajouter une dépense
            </h3>

            {formError && (
              <div className="mb-4 flex items-start gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350 rounded-2xl p-4 text-xs font-semibold">
                <span>⚠️</span>
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Titre */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                    Titre de la dépense
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Courses du soir, Essence, Bar..."
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    disabled={addingExpense}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm shadow-inner transition-colors"
                  />
                </div>

                {/* Montant */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                    Montant (€)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    disabled={addingExpense}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm shadow-inner transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payé par */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                    Payé par
                  </label>
                  <select
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    disabled={addingExpense}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm shadow-inner transition-colors cursor-pointer"
                  >
                    {group.members?.map((mId) => (
                      <option key={mId} value={mId}>
                        {usersMap[mId]?.username || mId.substring(0, 8)} {mId === user.uid ? "(Moi)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton de soumission */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={addingExpense}
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    {addingExpense ? "Enregistrement..." : "Ajouter la dépense"}
                  </button>
                </div>
              </div>

              {/* Concerne (Multi-sélecteur en cases à cocher) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                    Concerne (Qui a consommé ?)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExpenseConcerned(group.members || [])}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
                    >
                      Tout le monde
                    </button>
                    <span className="text-[10px] text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setExpenseConcerned([])}
                      className="text-[10px] text-slate-450 dark:text-slate-500 font-extrabold hover:underline"
                    >
                      Personne
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.members?.map((mId) => {
                    const isChecked = expenseConcerned.includes(mId);
                    const name = usersMap[mId]?.username || mId.substring(0, 8);
                    
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => handleToggleConcerned(mId)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          isChecked
                            ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/40 text-indigo-700 dark:text-indigo-400 shadow-sm"
                            : "bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-455 hover:border-slate-200"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-600 text-white font-black"
                            : "border-slate-300 dark:border-slate-700 text-transparent"
                        }`}>
                          ✓
                        </span>
                        <span className="truncate">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>

          {/* Liste/Historique des dépenses */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-lg">📜</span> Historique des dépenses
              </span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 font-black px-2.5 py-1 rounded-full shadow-inner">
                {expenses.length} dépense{expenses.length > 1 ? "s" : ""}
              </span>
            </h3>

            {loadingExpenses ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                Chargement de l'historique...
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-850 rounded-2xl">
                Aucune dépense enregistrée pour le moment.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {expenses.map((exp) => {
                  const payerName = usersMap[exp.paidBy]?.username || exp.paidBy.substring(0, 8);
                  const isCreator = exp.createdBy === user.uid;
                  
                  return (
                    <div
                      key={exp.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                            {exp.title}
                          </span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-455 px-2 py-0.5 rounded font-bold">
                            pour {exp.concerned?.length || 0} pers.
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          Payé par <strong className="text-slate-600 dark:text-slate-400 font-bold">{payerName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                          {exp.amount.toFixed(2)} €
                        </span>
                        {/* Autoriser la suppression si l'utilisateur est membre du groupe (ce qui est déjà vérifié par la sécurité) */}
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          type="button"
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 cursor-pointer shrink-0"
                          title="Supprimer cette dépense"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h4m-6-3a3 3 0 01-3-3V1m-4 4h12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne de droite : Les Membres du groupe */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-colors duration-300 space-y-6">
          
          {/* Section 1 : Liste des Membres */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <span className="text-lg">👥</span> Les Membres
            </h3>

            <div className="space-y-3.5">
              {group.members?.map((mId) => {
                const memberInfo = usersMap[mId];
                const displayName = memberInfo?.username || mId.substring(0, 8);
                const isCreator = group.createdBy === mId;
                
                return (
                  <div key={mId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      {memberInfo?.photoURL ? (
                        <img
                          src={memberInfo.photoURL}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200/50 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-805 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div className="min-w-0">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-250 block truncate">
                          {displayName} {mId === user.uid && "(Moi)"}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {isCreator ? "👑 Créateur" : "Compagnon"}
                        </span>
                      </div>
                    </div>

                    {/* Bouton de suppression du membre (sauf pour l'utilisateur connecté) */}
                    {mId !== user.uid && (
                      <button
                        onClick={() => handleRemoveMember(mId)}
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 cursor-pointer shrink-0"
                        title={`Retirer ${displayName} du groupe`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ajouter un membre */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-805 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
              Ajouter un membre
            </h4>

            {/* 1. Sélection par amis */}
            {nonMemberFriends.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  Parmi vos amis
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedFriendUid}
                    onChange={(e) => setSelectedFriendUid(e.target.value)}
                    className="flex-grow px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs shadow-inner cursor-pointer"
                  >
                    <option value="">Sélectionner un ami...</option>
                    {nonMemberFriends.map((f) => (
                      <option key={f.uid} value={f.uid}>
                        {f.username}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddMember(selectedFriendUid)}
                    disabled={!selectedFriendUid}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-2.5 rounded-xl text-xs shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}

            {/* 2. Ajout par UID manuel */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                Par son identifiant (UID)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coller l'identifiant UID..."
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value)}
                  className="flex-grow px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs shadow-inner focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddMember(manualUid)}
                  disabled={!manualUid.trim()}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold px-3 py-2.5 rounded-xl text-xs shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupDetails;
