import { useState } from "react";
import { updateProfile, deleteUser } from "firebase/auth";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";

/**
 * Composant de réglages du profil utilisateur.
 * Gère la modification du pseudo, l'upload d'avatar en Base64 compressé localement (sans Storage) et la suppression de compte conforme au RGPD.
 * 
 * @param {object} props
 * @param {object} props.user L'utilisateur Firebase Auth actuellement connecté
 * @param {function} props.refreshUser Fonction pour rafraîchir l'état utilisateur local
 * @param {function} props.onBack Callback pour retourner au planning principal
 */
export function ProfileSettings({ user, refreshUser, onBack }) {
  const [username, setUsername] = useState(user.displayName || "");
  const [updating, setUpdating] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // Gérer la mise à jour du pseudo
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage({ type: "error", text: "Le nom d'utilisateur ne peut pas être vide." });
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      // 1. Mettre à jour Firebase Auth
      await updateProfile(auth.currentUser, { displayName: username });

      // 2. Mettre à jour (ou créer si inexistant) le document Firestore users
      await setDoc(
        doc(db, "users", user.uid),
        {
          username: username,
          email: user.email,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // 3. Rafraîchir l'utilisateur dans l'état parent
      await refreshUser();

      setMessage({ type: "success", text: "Pseudo mis à jour avec succès !" });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil :", error);
      setMessage({ type: "error", text: "Une erreur est survenue lors de la mise à jour." });
    } finally {
      setUpdating(false);
    }
  };

  // Traiter la sélection et la compression de l'image de profil
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUpdatingAvatar(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Créer un canvas pour le redimensionnement et la compression locale
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          // Conserver le ratio d'aspect tout en limitant les dimensions maximales à 256x256
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Compresser fortement l'image en JPEG (qualité 0.6) et récupérer la chaîne Base64
          const base64String = canvas.toDataURL("image/jpeg", 0.6);

          // 1. Mettre à jour Firebase Auth
          await updateProfile(auth.currentUser, { photoURL: base64String });

          // 2. Mettre à jour le document Firestore users
          await setDoc(
            doc(db, "users", user.uid),
            {
              photoURL: base64String,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );

          // 3. Rafraîchir l'état utilisateur local
          await refreshUser();

          setMessage({ type: "success", text: "Photo de profil mise à jour avec succès !" });
        } catch (error) {
          console.error("Erreur lors de la compression/sauvegarde de la photo :", error);
          setMessage({ type: "error", text: "Impossible de mettre à jour la photo de profil." });
        } finally {
          setUpdatingAvatar(false);
        }
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Erreur lors de la lecture du fichier." });
      setUpdatingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  // Gérer la suppression du compte (RGPD)
  const handleDeleteAccount = async () => {
    const confirmation = window.confirm(
      "Êtes-vous absolument sûr de vouloir supprimer votre compte définitivement ? Cette action supprimera vos données d'utilisateur et est irréversible."
    );

    if (!confirmation) return;

    setDeleting(true);
    setMessage(null);

    try {
      // 1. Supprimer le document Firestore d'abord (pendant qu'on est encore authentifié)
      await deleteDoc(doc(db, "users", user.uid));

      // 2. Tenter de supprimer l'utilisateur Firebase Auth
      await deleteUser(auth.currentUser);

      // Si réussi, Firebase Auth va déclencher le changement d'état (déconnexion automatique)
    } catch (error) {
      console.error("Erreur lors de la suppression de compte :", error);

      // Gérer le cas spécifique où la connexion est trop ancienne
      if (error.code === "auth/requires-recent-login") {
        // Restaurer le document Firestore pour conserver la cohérence des données
        try {
          await setDoc(
            doc(db, "users", user.uid),
            {
              username: user.displayName || user.email.split("@")[0],
              email: user.email,
              photoURL: user.photoURL || null,
              createdAt: serverTimestamp()
            },
            { merge: true }
          );
        } catch (restoreError) {
          console.error("Erreur lors de la restauration du document :", restoreError);
        }

        setMessage({
          type: "error",
          text: "Cette opération est sensible et nécessite une connexion récente. Veuillez vous déconnecter, vous reconnecter, puis réessayer la suppression."
        });
      } else {
        setMessage({
          type: "error",
          text: "Impossible de supprimer votre compte. Veuillez réessayer plus tard."
        });
      }
      setDeleting(false);
    }
  };

  const initiales = (user.displayName || user.email.split("@")[0]).charAt(0).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in duration-300">
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
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          Mon Profil / Réglages
        </h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
          Gérez vos informations personnelles, votre photo de profil et vos préférences de compte
        </p>
      </div>

      {/* Alertes de retour d'expérience */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm animate-fade-in border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-350"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-350"
          }`}
        >
          {message.type === "success" ? (
            <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div className="font-medium">{message.text}</div>
        </div>
      )}

      {/* Section 1 : Informations de base */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Informations personnelles
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Modifiez votre photo de profil et votre pseudonyme public.
          </p>
        </div>

        {/* Section Upload d'Avatar */}
        <div className="flex flex-col items-center justify-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500 shadow-md">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-3xl">
                {initiales}
              </div>
            )}
            
            {/* Overlay de survol */}
            <label
              htmlFor="avatar-upload-input"
              className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Modifier</span>
            </label>
          </div>
          
          <input
            id="avatar-upload-input"
            type="file"
            accept="image/*"
            disabled={updating || updatingAvatar || deleting}
            onChange={handleImageChange}
            className="hidden"
          />
          
          {updatingAvatar && (
            <span className="text-xs text-indigo-500 font-semibold mt-2.5 animate-pulse">
              Compression et mise à jour de la photo...
            </span>
          )}
        </div>

        {/* Formulaire Modification Pseudo */}
        <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
          {/* Adresse Email (Lecture seule) */}
          <div>
            <label className="block text-sm font-semibold text-slate-500 mb-1">
              Adresse e-mail (non modifiable)
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={user.email}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed text-sm focus:outline-none"
            />
          </div>

          {/* Nom d'utilisateur / Pseudo */}
          <div>
            <label htmlFor="settings-username" className="block text-sm font-semibold text-slate-700 dark:text-slate-305 mb-1">
              Nom d'utilisateur / Pseudo
            </label>
            <input
              id="settings-username"
              type="text"
              required
              disabled={updating || updatingAvatar || deleting}
              placeholder="Votre pseudo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all duration-200 text-sm"
            />
          </div>

          {/* Bouton de soumission */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updating || updatingAvatar || deleting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm"
            >
              {updating ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>Enregistrer le pseudo</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2 : Zone de Danger / RGPD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-950/20 shadow-sm transition-colors duration-300 overflow-hidden">
        <div className="p-6 border-b border-rose-50 dark:border-rose-950/25 bg-rose-50/20 dark:bg-rose-950/5">
          <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">
            Zone de danger
          </h3>
          <p className="text-xs text-rose-500/80 dark:text-rose-400/70">
            Actions irréversibles et sensibles relatives au droit à l'effacement (RGPD).
          </p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            En supprimant votre compte, toutes vos tâches, traqueurs, préférences et informations de profil stockées dans nos bases de données seront définitivement et immédiatement supprimés.
          </p>

          <div className="flex justify-start">
            <button
              onClick={handleDeleteAccount}
              disabled={updating || updatingAvatar || deleting}
              type="button"
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm"
            >
              {deleting ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>Supprimer mon compte</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
