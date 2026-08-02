import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories.js";
import { auth, db } from "../firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";


// Jours de la semaine ordonnés selon l'usage français (Lundi à Dimanche) avec valeur de Date.getDay()
const WEEKDAYS = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "M", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 0 }
];

/**
 * Composant Modale BlockFormModal pour ajouter ou modifier un bloc de temps.
 * Permet de saisir librement des catégories, d'ajouter une description, de planifier des récurrences.
 * Supporte le mode sombre et le multilingue (i18n).
 */
export function BlockFormModal({ isOpen, onClose, onSave, onDelete, block, selectedDate }) {
  const { t } = useTranslation();

  // Liste des amis et sélection
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState(() => {
    if (block && block.sharedWith) {
      const creatorId = block.userId || auth.currentUser?.uid;
      return block.sharedWith.filter(id => id !== creatorId);
    }
    return [];
  });
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Charger la liste des amis acceptés lorsque la modale s'ouvre
  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;

    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
        const uid = auth.currentUser.uid;
        const q1 = query(
          collection(db, "friendships"),
          where("senderId", "==", uid),
          where("status", "==", "accepted")
        );
        const q2 = query(
          collection(db, "friendships"),
          where("receiverId", "==", uid),
          where("status", "==", "accepted")
        );

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const list1 = snap1.docs.map((doc) => {
          const d = doc.data();
          return { uid: d.receiverId, username: d.receiverUsername };
        });
        const list2 = snap2.docs.map((doc) => {
          const d = doc.data();
          return { uid: d.senderId, username: d.senderUsername };
        });

        const merged = [...list1, ...list2];
        const unique = merged.filter((item, index, self) =>
          self.findIndex((t) => t.uid === item.uid) === index
        );

        setFriends(unique);
      } catch (err) {
        console.error("Erreur lors de la récupération des amis dans la modale :", err);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [isOpen]);

  const canEdit = !block || !block.creatorId || block.creatorId === auth.currentUser?.uid;

  const getParticipantUsername = (uid) => {
    if (uid === auth.currentUser?.uid) {
      return "Vous";
    }
    const friend = friends.find((f) => f.uid === uid);
    return friend ? friend.username : "Un ami";
  };

  const checkConflicts = async (start, end, participants) => {
    const conflicts = [];

    const timeToMinutes = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const s1 = timeToMinutes(start);
    const e1 = timeToMinutes(end);

    const checkPromises = participants.map(async (uid) => {
      const q = query(
        collection(db, "time_blocks"),
        where("dateString", "==", selectedDate),
        where("sharedWith", "array-contains", uid)
      );
      const snap = await getDocs(q);

      for (const d of snap.docs) {
        if (block && d.id === block.id) continue;

        const data = d.data();
        if (data.isLongTerm) continue;

        const s2 = timeToMinutes(data.startTime);
        const e2 = timeToMinutes(data.endTime);

        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          conflicts.push({
            uid,
            blockTitle: data.title,
            startTime: data.startTime,
            endTime: data.endTime
          });
          break;
        }
      }
    });

    await Promise.all(checkPromises);
    return conflicts;
  };

  // Initialisation directe de l'état avec les valeurs du bloc (ou par défaut)
  const [title, setTitle] = useState(block ? block.title || "" : "");
  const [startTime, setStartTime] = useState(block ? block.startTime || "09:00" : "09:00");
  const [endTime, setEndTime] = useState(block ? block.endTime || "10:00" : "10:00");
  const [category, setCategory] = useState(block ? block.category || "" : "");
  const [description, setDescription] = useState(block ? block.description || "" : "");

  // États locaux pour le traqueur longue durée
  const [isLongTerm, setIsLongTerm] = useState(block ? block.isLongTerm || false : false);
  const [endDateTime, setEndDateTime] = useState(() => {
    if (block && block.endDateTime) return block.endDateTime;
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    const y = demain.getFullYear();
    const m = String(demain.getMonth() + 1).padStart(2, "0");
    const d = String(demain.getDate()).padStart(2, "0");
    const h = String(demain.getHours()).padStart(2, "0");
    const min = String(demain.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d}T${h}:${min}`;
  });

  // États locaux de récurrence (visible uniquement à la création)
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatWeeksCount, setRepeatWeeksCount] = useState(4);
  const [selectedDays, setSelectedDays] = useState(() => {
    if (selectedDate) {
      const [year, month, day] = selectedDate.split("-").map(Number);
      return [new Date(year, month - 1, day).getDay()];
    }
    return [1]; // Lundi par défaut
  });

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validations locales
    if (!title.trim()) {
      setError(t("modal.errorTitle"));
      return;
    }

    let payload = {
      title: title.trim(),
      category: category.trim() || "Autre",
      description: description.trim(),
      isLongTerm
    };

    if (isLongTerm) {
      if (!endDateTime) {
        setError(t("modal.errorEndDateTime"));
        return;
      }
      const end = new Date(endDateTime);
      if (end.getTime() <= Date.now()) {
        setError(t("modal.errorEndFuture"));
        return;
      }
      payload.endDateTime = endDateTime;
      const maintenant = new Date();
      const formatTime = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      payload.startTime = block ? block.startTime || formatTime(maintenant) : formatTime(maintenant);
      payload.endTime = block ? block.endTime || formatTime(maintenant) : formatTime(maintenant);
    } else {
      if (!startTime || !endTime) {
        setError(t("modal.errorTime"));
        return;
      }

      // Convertir les heures en minutes pour comparaison
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      if (startMin >= endMin) {
        setError(t("modal.errorTimeOrder"));
        return;
      }
      payload.startTime = startTime;
      payload.endTime = endTime;
    }

    if (!isLongTerm && repeatWeekly && (!selectedDays || selectedDays.length === 0)) {
      setError(t("modal.errorRecurrence"));
      return;
    }

    setSubmitting(true);

    // Vérification anti-conflit (uniquement pour les événements non-long-terme)
    if (!isLongTerm) {
      try {
        const participants = [auth.currentUser?.uid].filter(Boolean);
        const conflicts = await checkConflicts(startTime, endTime, participants);
        if (conflicts.length > 0) {
          const firstConflict = conflicts[0];
          const username = getParticipantUsername(firstConflict.uid);
          setError(`Impossible : ${username} a déjà un événement prévu de ${firstConflict.startTime} à ${firstConflict.endTime} (${firstConflict.blockTitle})`);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Erreur lors du contrôle anti-conflit :", err);
        setError("Erreur lors de la vérification de la disponibilité des participants.");
        setSubmitting(false);
        return;
      }
    }

    try {
      await onSave({
        ...payload,
        sharedWith: selectedFriends,
        // Transmettre les options de récurrence si c'est une création et pas un traqueur
        ...(!block && !isLongTerm ? {
          repeatWeekly,
          repeatWeeksCount: Number(repeatWeeksCount),
          selectedDays
        } : {})
      });
      onClose();
    } catch (err) {
      console.error("Erreur d'enregistrement :", err);
      setError(t("modal.errorSave"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!block || !onDelete) return;

    const confirmation = window.confirm(t("modal.confirmDelete"));
    if (!confirmation) return;

    setSubmitting(true);
    try {
      await onDelete(block.id);
      onClose();
    } catch (err) {
      console.error("Erreur de suppression :", err);
      setError(t("modal.errorDelete"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transform scale-100 transition-transform p-6 relative">

        {/* Entête */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            {block ? t("modal.editTitle") : t("modal.addTitle")}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Banner Événement partagé */}
        {!canEdit && (
          <div className="mb-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-205 dark:border-indigo-900/55 text-indigo-800 dark:text-indigo-400 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2">
            <span>🤝 Événement partagé créé par <span className="underline">{block.creatorUsername || "Inconnu"}</span></span>
          </div>
        )}

        {/* Message d'erreur local */}
        {error && (
          <div className="mb-4 flex items-start gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350 rounded-xl p-3.5 text-xs">
            <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Titre */}
          <div>
            <label htmlFor="modal-title" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("modal.labelTitle")}
            </label>
            <input
              id="modal-title"
              type="text"
              required
              disabled={submitting || !canEdit}
              placeholder={t("modal.placeholderTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 font-medium"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label htmlFor="modal-category" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("modal.labelCategory")}
            </label>
            <input
              id="modal-category"
              type="text"
              list="category-suggestions"
              disabled={submitting || !canEdit}
              placeholder={t("modal.placeholderCategory")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 font-medium"
            />
            <datalist id="category-suggestions">
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.label} />
              ))}
            </datalist>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="modal-description" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("modal.labelDescription")}
            </label>
            <textarea
              id="modal-description"
              rows={3}
              disabled={submitting || !canEdit}
              placeholder={t("modal.placeholderDescription")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 font-medium resize-none"
            />
          </div>

          {/* Section Partager avec des amis */}
          {loadingFriends ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold animate-pulse py-1">
              Chargement de vos amis...
            </div>
          ) : friends.length > 0 ? (
            <div className="space-y-2 bg-slate-50 dark:bg-slate-850 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all duration-200">
              <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Partager avec des amis (Optionnel)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                {friends.map((friend) => {
                  const isChecked = selectedFriends.includes(friend.uid);
                  return (
                    <label key={friend.uid} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={submitting || !canEdit}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedFriends(selectedFriends.filter(id => id !== friend.uid));
                          } else {
                            setSelectedFriends([...selectedFriends, friend.uid]);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-350 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                      />
                      <span className="font-semibold truncate">{friend.username}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Option Traqueur Longue Durée */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-850 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all duration-200">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={submitting || !canEdit}
                checked={isLongTerm}
                onChange={(e) => {
                  setIsLongTerm(e.target.checked);
                  if (e.target.checked) {
                    setRepeatWeekly(false);
                  }
                }}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {t("modal.labelIsLongTerm")}
              </span>
            </label>
          </div>

          {/* Horaires ou Date et Heure de fin */}
          {!isLongTerm ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="modal-start-time" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("modal.labelStartTime")}
                </label>
                <input
                  id="modal-start-time"
                  type="time"
                  required
                  disabled={submitting || !canEdit}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 font-medium"
                />
              </div>
              <div>
                <label htmlFor="modal-end-time" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("modal.labelEndTime")}
                </label>
                <input
                  id="modal-end-time"
                  type="time"
                  required
                  disabled={submitting || !canEdit}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 font-medium"
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="modal-end-datetime" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("modal.labelEndDateTime")}
              </label>
              <input
                id="modal-end-datetime"
                type="datetime-local"
                required
                disabled={submitting || !canEdit}
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 font-medium"
              />
            </div>
          )}

          {/* Options de récurrence (visibles uniquement à la création et pas pour les traqueurs) */}
          {!block && !isLongTerm && (
            <div className="space-y-4 bg-slate-50 dark:bg-slate-850 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all duration-200">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={submitting || !canEdit}
                  checked={repeatWeekly}
                  onChange={(e) => setRepeatWeekly(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t("modal.labelRepeat")}
                </span>
              </label>

              {/* Contenu de récurrence à apparition fluide */}
              {repeatWeekly && (
                <div className="pt-3 border-t border-slate-200/50 dark:border-slate-750/50 animate-fade-in space-y-4">
                  {/* Sélecteur de jours de la semaine */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("modal.labelDays")}
                    </span>
                    <div className="flex gap-1 justify-between">
                      {WEEKDAYS.map((day) => {
                        const isSelected = selectedDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            disabled={submitting || !canEdit}
                            onClick={() => {
                              if (isSelected) {
                                // Garder au moins un jour sélectionné
                                if (selectedDays.length > 1) {
                                  setSelectedDays(selectedDays.filter((d) => d !== day.value));
                                }
                              } else {
                                setSelectedDays([...selectedDays, day.value]);
                              }
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-200 cursor-pointer select-none ${isSelected
                                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                                : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300"
                              }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nombre de semaines */}
                  <div className="space-y-1">
                    <label htmlFor="modal-weeks-count" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("modal.labelWeeks")}
                    </label>
                    <input
                      id="modal-weeks-count"
                      type="number"
                      min={1}
                      max={52}
                      required
                      disabled={submitting || !canEdit}
                      value={repeatWeeksCount}
                      onChange={(e) => setRepeatWeeksCount(Math.min(52, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 font-medium"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      {t("modal.maxWeeksNote")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex flex-col-reverse sm:flex-row gap-2 justify-end border-t border-slate-100 dark:border-slate-800 mt-6">
            {/* Bouton de Suppression (affiché seulement si modification d'un bloc existant et modifiable) */}
            {block && onDelete && canEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-450 font-bold transition-all duration-200 cursor-pointer active:scale-95 text-center mr-auto"
              >
                {t("modal.btnDelete")}
              </button>
            )}

            <button
              onClick={onClose}
              type="button"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-305 font-bold transition-all duration-200 cursor-pointer active:scale-95 text-center"
            >
              {canEdit ? t("modal.btnCancel") : "Fermer"}
            </button>

            {canEdit && (
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all duration-200 shadow-md shadow-indigo-600/10 dark:shadow-indigo-500/20 cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <span>{block ? t("modal.btnSaveEdit") : t("modal.btnSaveAdd")}</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default BlockFormModal;
