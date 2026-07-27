import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase.js";

/**
 * Hook personnalisé useAuth pour gérer l'authentification Firebase.
 * Fournit l'état de l'utilisateur courant, le chargement, et les fonctions
 * nécessaires à la connexion, l'inscription et la déconnexion.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Écouteur de changement d'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Connexion avec Google
  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    // Force la sélection du compte Google à chaque connexion
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  }, []);

  // Connexion classique Email / Mot de passe
  const loginWithEmail = useCallback(async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  // Inscription classique Email / Mot de passe avec pseudo et doc Firestore
  const registerWithEmail = useCallback(async (email, password, username) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Mise à jour du pseudo dans le profil Firebase Auth
    await updateProfile(user, { displayName: username });

    // Création du document utilisateur dans Firestore
    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: user.email,
      createdAt: serverTimestamp()
    });

    // Recharger l'utilisateur pour s'assurer que displayName est à jour dans l'état local
    await user.reload();
    setUser(auth.currentUser);

    return userCredential;
  }, []);

  // Déconnexion
  const logout = useCallback(async () => {
    return signOut(auth);
  }, []);

  // Rafraîchir les informations de l'utilisateur courant
  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }, []);

  return {
    user,
    loading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    refreshUser
  };
}

export default useAuth;
