import useAuth from "./hooks/useAuth.js";
import Auth from "./components/Auth.jsx";
import Dashboard from "./components/Dashboard.jsx";

function App() {
  const { user, loading, logout, refreshUser } = useAuth();

  // 1. Écran de chargement moderne (pendant la vérification de l'état Firebase)
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900">
        <div className="relative flex items-center justify-center">
          {/* Cercles de chargement superposés avec animations */}
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <div className="absolute w-10 h-10 rounded-full border-4 border-purple-500/20 border-b-purple-500 animate-spin duration-750" />
        </div>
        <p className="mt-4 text-slate-300 font-medium tracking-wide animate-pulse">
          Chargement de votre session...
        </p>
      </div>
    );
  }

  // 2. Si l'utilisateur n'est pas connecté, afficher le composant d'authentification
  if (!user) {
    return <Auth />;
  }

  // 3. Si l'utilisateur est connecté, afficher le tableau de bord interactif principal
  return <Dashboard user={user} onLogout={logout} refreshUser={refreshUser} />;
}

export default App;