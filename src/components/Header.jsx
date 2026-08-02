import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Composant Header réutilisable avec sélecteur de langue i18n et de thèmes.
 * Les boutons "Mon Profil" et "Déconnexion" sont regroupés dans un menu déroulant sur l'avatar.
 */
export function Header({
  theme,
  toggleTheme,
  user,
  onLogout,
  permission,
  requestPermission,
  activeTab,
  onNavigate
}) {
  const { t, i18n } = useTranslation();
  const nomUtilisateur = user.displayName || user.email.split("@")[0];

  // Gestion du menu déroulant (Dropdown) de l'avatar
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fermer le menu si clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 py-4 px-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between transition-colors duration-300">
      {/* Section Logo */}
      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/10">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          {t("header.title")}
        </span>
      </div>

      {/* Section Contrôles, Langues et Infos Utilisateur */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3.5 w-full sm:w-auto">
        {/* Bouton d'activation des notifications locales */}
        {permission === "default" && (
          <button
            onClick={requestPermission}
            type="button"
            className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-900/50 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            title={t("header.activateAlerts")}
          >
            <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="hidden md:inline text-xs font-black">{t("header.activateAlerts")}</span>
          </button>
        )}

        {/* Sélecteur de Langue (4 drapeaux sous forme d'emojis) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/20 dark:border-slate-700/30 transition-colors duration-300">
          {[
            { code: "fr", flag: "🇫🇷", label: "Français" },
            { code: "en", flag: "🇬🇧", label: "English" },
            { code: "es", flag: "🇪🇸", label: "Español" },
            { code: "it", flag: "🇮🇹", label: "Italiano" }
          ].map((lang) => {
            const isActive = i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                type="button"
                className={`w-7.5 h-7.5 text-base flex items-center justify-center rounded-lg transition-all duration-200 active:scale-90 cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-900 shadow-sm scale-110 opacity-100"
                    : "opacity-45 hover:opacity-85 hover:scale-105"
                }`}
                title={lang.label}
              >
                {lang.flag}
              </button>
            );
          })}
        </div>

        {/* Bouton Thème */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center border border-transparent dark:border-slate-700/20"
          title={theme === "dark" ? t("header.lightMode") : t("header.darkMode")}
        >
          {theme === "dark" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Info Session */}
        <div className="hidden md:flex flex-col text-right">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            {t("header.activeSession")}
          </span>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
            {t("header.hello", { name: nomUtilisateur })}
          </span>
        </div>

        {/* Avatar avec Menu Déroulant */}
        <div className="relative inline-block text-left" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            type="button"
            className="w-10 h-10 rounded-full border border-indigo-100 dark:border-slate-800 shadow-sm shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Menu utilisateur"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={nomUtilisateur}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner">
                {nomUtilisateur.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {/* Menu Déroulant Flottant */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-50 animate-fade-in duration-200">
              {/* Option Mon Profil */}
              <button
                onClick={() => {
                  onNavigate("profile");
                  setIsDropdownOpen(false);
                }}
                type="button"
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Mon Profil</span>
              </button>

              {/* Option Mon Réseau */}
              <button
                onClick={() => {
                  onNavigate("network");
                  setIsDropdownOpen(false);
                }}
                type="button"
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                  activeTab === "network"
                    ? "bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Mon Réseau</span>
              </button>

              {/* Option Déconnexion */}
              <button
                onClick={() => {
                  onLogout();
                  setIsDropdownOpen(false);
                }}
                type="button"
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Déconnexion</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
