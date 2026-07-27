import { useState } from "react";
import useAuth from "../hooks/useAuth.js";

/**
 * Dictionnaire de traduction en français des codes d'erreurs Firebase Auth.
 */
const TRADUCTION_ERREURS_FIREBASE = {
  "auth/invalid-email": "L'adresse e-mail saisie n'est pas valide.",
  "auth/user-disabled": "Ce compte a été désactivé par l'administrateur.",
  "auth/user-not-found": "Aucun compte n'existe pour cette adresse e-mail.",
  "auth/wrong-password": "Le mot de passe saisi est incorrect.",
  "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
  "auth/email-already-in-use": "Cette adresse e-mail est déjà associée à un compte existant.",
  "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
  "auth/operation-not-allowed": "Cette méthode d'authentification n'est pas activée.",
  "auth/popup-closed-by-user": "La fenêtre de connexion Google a été fermée avant la fin de l'opération.",
  "auth/too-many-requests": "Trop de tentatives infructueuses. Votre compte a été temporairement bloqué. Veuillez réessayer plus tard.",
  "auth/network-request-failed": "Erreur réseau. Veuillez vérifier votre connexion Internet."
};

/**
 * Traduit un code d'erreur Firebase en français.
 * @param {string} code Le code d'erreur Firebase
 * @returns {string} Message traduit
 */
function getMessageErreur(code) {
  return TRADUCTION_ERREURS_FIREBASE[code] || "Une erreur inattendue est survenue. Veuillez réessayer.";
}

export function Auth() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  
  // États de l'interface
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  
  // États de chargement et d'erreur
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Basculer entre Connexion et Inscription
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
  };

  // Soumission du formulaire Email / Mot de passe
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validations locales basiques
    if (!email || !password) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (isSignUp && !username) {
      setError("Veuillez saisir un nom d'utilisateur.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (isSignUp && password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await registerWithEmail(email, password, username);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      console.error("Erreur d'authentification par email :", err);
      setError(getMessageErreur(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  // Connexion Google
  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Erreur d'authentification Google :", err);
      setError(getMessageErreur(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Éléments de fond décoratifs animés (subtils et premium) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-700/20 blur-3xl animate-pulse duration-10000" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-700/20 blur-3xl animate-pulse duration-10000 delay-2000" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Entête de l'application */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transform hover:scale-105 transition-transform duration-300">
            {/* Logo Icône de Productivité (Calendrier / Horloge stylisé) */}
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl text-center">
            Planity
          </h2>
          <p className="mt-2 text-sm text-slate-400 text-center">
            Votre espace de productivité personnelle
          </p>
        </div>

        {/* Conteneur principal sous forme de carte vitrée (glassmorphism) */}
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl p-8 border border-white/20 transition-all duration-300">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-slate-800">
              {isSignUp ? "Créer un compte" : "Bon retour parmi nous"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isSignUp ? "Remplissez les détails ci-dessous" : "Connectez-vous pour continuer"}
            </p>
          </div>

          {/* Affichage des erreurs en français */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm animate-fade-in duration-200">
              <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Bouton d'authentification Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {/* Logo Google SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Continuer avec Google</span>
          </button>

          {/* Séparateur de formulaire */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              ou
            </span>
          </div>

          {/* Formulaire Classique */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="animate-fade-in duration-200">
                <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  disabled={submitting}
                  placeholder="Votre pseudo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white text-slate-800 transition-all duration-200"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                required
                disabled={submitting}
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white text-slate-800 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                disabled={submitting}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white text-slate-800 transition-all duration-200"
              />
            </div>

            {/* Champ de confirmation du mot de passe pour l'inscription */}
            {isSignUp && (
              <div className="animate-fade-in duration-200">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  disabled={submitting}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white text-slate-800 transition-all duration-200"
                />
              </div>
            )}

            {/* Bouton de validation du formulaire */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center"
            >
              {submitting ? (
                // Indicateur de chargement / Spinner
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>{isSignUp ? "Créer un compte" : "Se connecter par e-mail"}</span>
              )}
            </button>
          </form>

          {/* Lien pour basculer de mode */}
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-500">
              {isSignUp ? "Vous avez déjà un compte ?" : "Nouveau sur Planity ?"}
            </span>{" "}
            <button
              type="button"
              onClick={toggleMode}
              disabled={submitting}
              className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors focus:outline-none cursor-pointer"
            >
              {isSignUp ? "Connectez-vous" : "Créez un compte gratuitement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
