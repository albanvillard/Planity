import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  fr: {
    translation: {
      header: {
        title: "Planity",
        activeSession: "Session active",
        hello: "Bonjour, {{name}}",
        logout: "Déconnexion",
        activateAlerts: "Activer les alertes",
        lightMode: "Activer le mode clair",
        darkMode: "Activer le mode sombre"
      },
      dashboard: {
        myDay: "Ma Journée",
        tasksCount_one: "{{count}} tâche planifiée",
        tasksCount_other: "{{count}} tâches planifiées",
        addTask: "Ajouter une tâche",
        planningTab: "Planning",
        statsTab: "Statistiques"
      },
      dateSelector: {
        today: "Aujourd'hui",
        prevDay: "Jour précédent",
        nextDay: "Jour suivant"
      },
      modal: {
        addTitle: "Ajouter un bloc de temps",
        editTitle: "Modifier le bloc",
        errorTitle: "Veuillez saisir un titre.",
        errorTime: "Veuillez saisir l'heure de début et l'heure de fin.",
        errorTimeOrder: "L'heure de fin doit être strictement supérieure à l'heure de début.",
        errorRecurrence: "Veuillez sélectionner au moins un jour de la semaine pour la récurrence.",
        errorEndDateTime: "Veuillez saisir la date et l'heure de fin du traqueur.",
        errorEndFuture: "La date de fin doit être dans le futur.",
        errorSave: "Impossible d'enregistrer le bloc de temps. Veuillez réessayer.",
        errorDelete: "Impossible de supprimer le bloc de temps.",
        confirmDelete: "Êtes-vous sûr de vouloir supprimer ce bloc de temps ?",
        labelTitle: "Titre de la tâche / bloc",
        labelCategory: "Catégorie",
        labelDescription: "Description (optionnel)",
        labelStartTime: "Heure de début",
        labelEndTime: "Heure de fin",
        labelIsLongTerm: "Tâche sur plusieurs jours (Traqueur)",
        labelEndDateTime: "Date et Heure de fin du traqueur",
        labelRepeat: "Répéter cette tâche chaque semaine",
        labelDays: "Jours de la semaine",
        labelWeeks: "Pendant combien de semaines ?",
        maxWeeksNote: "Maximum 52 semaines (1 an).",
        btnDelete: "Supprimer",
        btnCancel: "Annuler",
        btnSaveAdd: "Ajouter la tâche",
        btnSaveEdit: "Modifier la tâche",
        placeholderTitle: "ex: Réunion d'équipe SLAM",
        placeholderCategory: "Saisissez ou choisissez une catégorie (ex: SLAM, Sport...)",
        placeholderDescription: "Détails de la tâche, liste de courses, notes importantes..."
      },
      timeline: {
        emptyTitle: "Aucune tâche planifiée",
        emptyDesc: "Votre journée est libre. Cliquez sur \"Ajouter une tâche\" pour planifier votre premier bloc de temps.",
        planningView: "Planning horaire",
        listView: "Liste chronologique"
      },
      trackers: {
        title: "Traqueurs Longue Durée",
        expired: "Terminé !",
        remaining: "Temps restant : {{time}}"
      },
      stats: {
        loading: "Chargement des statistiques...",
        error: "Erreur lors de la récupération des données statistiques.",
        emptyTitle: "Aucune donnée cette semaine",
        emptyDesc: "Planifiez des tâches pour la semaine du {{start}} au {{end}} pour voir apparaître la répartition de votre temps.",
        timePlanned: "Temps planifié cette semaine",
        hours_one: "{{count}} heure",
        hours_other: "{{count}} heures",
        hoursShort: "h",
        weekRange: "Semaine du {{start}} au {{end}}",
        mainFocus: "Focus principal",
        focusHours: "{{count}} heure passée sur cette catégorie.",
        focusHours_plural: "{{count}} heures passées sur cette catégorie.",
        mainFocusDesc: "Catégorie la plus chronophage",
        distribution: "Répartition par activité",
        chartDuration: "Durée"
      },
      weather: {
        sunny: "Ciel dégagé",
        mainlyClear: "Principalement dégagé",
        partlyCloudy: "Partiellement nuageux",
        overcast: "Couvert",
        fog: "Brouillard",
        depositingRimeFog: "Brouillard givrant",
        lightDrizzle: "Bruine légère",
        moderateDrizzle: "Bruine modérée",
        denseDrizzle: "Bruine dense",
        lightRain: "Pluie faible",
        moderateRain: "Pluie modérée",
        heavyRain: "Pluie forte",
        lightSnow: "Neige faible",
        moderateSnow: "Neige modérée",
        heavySnow: "Neige forte",
        lightShowers: "Averses de pluie faibles",
        moderateShowers: "Averses de pluie modérées",
        heavyShowers: "Averses de pluie fortes",
        thunderstorm: "Orage",
        thunderstormSlightHail: "Orage avec grêle légère",
        thunderstormHeavyHail: "Orage avec grêle forte",
        unknown: "Météo",
        refreshPosition: "Actualiser ma position",
        locationRequired: "L'autorisation de géolocalisation a été refusée ou n'est pas supportée par votre navigateur."
      }
    }
  },
  en: {
    translation: {
      header: {
        title: "Planity",
        activeSession: "Active session",
        hello: "Hello, {{name}}",
        logout: "Logout",
        activateAlerts: "Enable alerts",
        lightMode: "Enable light mode",
        darkMode: "Enable dark mode"
      },
      dashboard: {
        myDay: "My Day",
        tasksCount_one: "{{count}} scheduled task",
        tasksCount_other: "{{count}} scheduled tasks",
        addTask: "Add a task",
        planningTab: "Planning",
        statsTab: "Statistics"
      },
      dateSelector: {
        today: "Today",
        prevDay: "Previous day",
        nextDay: "Next day"
      },
      modal: {
        addTitle: "Add time block",
        editTitle: "Modify block",
        errorTitle: "Please enter a title.",
        errorTime: "Please enter start time and end time.",
        errorTimeOrder: "End time must be strictly after start time.",
        errorRecurrence: "Please select at least one day of the week for recurrence.",
        errorEndDateTime: "Please enter the end date and time for the tracker.",
        errorEndFuture: "End date must be in the future.",
        errorSave: "Unable to save time block. Please try again.",
        errorDelete: "Unable to delete time block.",
        confirmDelete: "Are you sure you want to delete this time block?",
        labelTitle: "Task / Block Title",
        labelCategory: "Category",
        labelDescription: "Description (optional)",
        labelStartTime: "Start time",
        labelEndTime: "End time",
        labelIsLongTerm: "Multi-day task (Tracker)",
        labelEndDateTime: "Tracker end date and time",
        labelRepeat: "Repeat this task every week",
        labelDays: "Days of the week",
        labelWeeks: "For how many weeks?",
        maxWeeksNote: "Maximum 52 weeks (1 year).",
        btnDelete: "Delete",
        btnCancel: "Cancel",
        btnSaveAdd: "Add task",
        btnSaveEdit: "Modify task",
        placeholderTitle: "e.g., SLAM team meeting",
        placeholderCategory: "Enter or choose a category (e.g., SLAM, Sport...)",
        placeholderDescription: "Task details, shopping list, important notes..."
      },
      timeline: {
        emptyTitle: "No scheduled tasks",
        emptyDesc: "Your day is free. Click on \"Add a task\" to schedule your first time block.",
        planningView: "Hourly schedule",
        listView: "Chronological list"
      },
      trackers: {
        title: "Long Term Trackers",
        expired: "Finished!",
        remaining: "Remaining time: {{time}}"
      },
      stats: {
        loading: "Loading statistics...",
        error: "Error retrieving statistical data.",
        emptyTitle: "No data this week",
        emptyDesc: "Schedule tasks for the week of {{start}} to {{end}} to see your time distribution.",
        timePlanned: "Time scheduled this week",
        hours_one: "{{count}} hour",
        hours_other: "{{count}} hours",
        hoursShort: "h",
        weekRange: "Week of {{start}} to {{end}}",
        mainFocus: "Main focus",
        focusHours: "{{count}} hour spent on this category.",
        focusHours_plural: "{{count}} hours spent on this category.",
        mainFocusDesc: "Most time-consuming category",
        distribution: "Distribution by activity",
        chartDuration: "Duration"
      },
      weather: {
        sunny: "Clear sky",
        mainlyClear: "Mainly clear",
        partlyCloudy: "Partly cloudy",
        overcast: "Overcast",
        fog: "Fog",
        depositingRimeFog: "Freezing fog",
        lightDrizzle: "Light drizzle",
        moderateDrizzle: "Moderate drizzle",
        denseDrizzle: "Heavy drizzle",
        lightRain: "Light rain",
        moderateRain: "Moderate rain",
        heavyRain: "Heavy rain",
        lightSnow: "Light snow",
        moderateSnow: "Moderate snow",
        heavySnow: "Heavy snow",
        lightShowers: "Light rain showers",
        moderateShowers: "Moderate rain showers",
        heavyShowers: "Heavy rain showers",
        thunderstorm: "Thunderstorm",
        thunderstormSlightHail: "Thunderstorm with slight hail",
        thunderstormHeavyHail: "Thunderstorm with heavy hail",
        unknown: "Weather",
        refreshPosition: "Update my location",
        locationRequired: "Location permission denied or not supported by your browser."
      }
    }
  },
  es: {
    translation: {
      header: {
        title: "Planity",
        activeSession: "Sesión activa",
        hello: "Hola, {{name}}",
        logout: "Cerrar sesión",
        activateAlerts: "Activar alertas",
        lightMode: "Activar modo claro",
        darkMode: "Activar modo oscuro"
      },
      dashboard: {
        myDay: "Mi Día",
        tasksCount_one: "{{count}} tarea programada",
        tasksCount_other: "{{count}} tareas programadas",
        addTask: "Añadir tarea",
        planningTab: "Planificación",
        statsTab: "Estadísticas"
      },
      dateSelector: {
        today: "Hoy",
        prevDay: "Día anterior",
        nextDay: "Día siguiente"
      },
      modal: {
        addTitle: "Añadir bloque de tiempo",
        editTitle: "Modificar bloque",
        errorTitle: "Por favor, introduzca un título.",
        errorTime: "Por favor, introduzca la hora de inicio y fin.",
        errorTimeOrder: "La hora de fin debe ser estrictamente posterior a la hora de inicio.",
        errorRecurrence: "Por favor, seleccione al menos un día de la semana para la recurrencia.",
        errorEndDateTime: "Por favor, introduzca la fecha y hora de fin del rastreador.",
        errorEndFuture: "La fecha de fin debe estar en el futuro.",
        errorSave: "No se pudo guardar el bloque de tiempo. Inténtelo de nuevo.",
        errorDelete: "No se pudo de eliminar el bloque de temps.",
        confirmDelete: "¿Está seguro de que desea eliminar este bloque de temps?",
        labelTitle: "Título de la tarea / bloque",
        labelCategory: "Categoría",
        labelDescription: "Descripción (opcional)",
        labelStartTime: "Hora de inicio",
        labelEndTime: "Hora de fin",
        labelIsLongTerm: "Tarea de varios días (Rastreador)",
        labelEndDateTime: "Fecha y hora de fin del rastreador",
        labelRepeat: "Repetir esta tarea todas las semanas",
        labelDays: "Días de la semana",
        labelWeeks: "¿Durante cuántas semanas?",
        maxWeeksNote: "Máximo 52 semanas (1 año).",
        btnDelete: "Eliminar",
        btnCancel: "Cancelar",
        btnSaveAdd: "Añadir tarea",
        btnSaveEdit: "Modificar tarea",
        placeholderTitle: "ej. Reunión del equipo SLAM",
        placeholderCategory: "Introduzca o elija una categoría (ej. SLAM, Deporte...)",
        placeholderDescription: "Detalles de la tarea, lista de compras, notas importantes..."
      },
      timeline: {
        emptyTitle: "No hay tareas programadas",
        emptyDesc: "Tu día está libre. Haz clic en \"Añadir tarea\" para programar tu primer bloque de tiempo.",
        planningView: "Planificación horaria",
        listView: "Lista cronológica"
      },
      trackers: {
        title: "Rastreadores de Larga Duración",
        expired: "¡Terminado!",
        remaining: "Tiempo restante: {{time}}"
      },
      stats: {
        loading: "Cargando estadísticas...",
        error: "Error al recuperar los datos estadísticos.",
        emptyTitle: "Sin datos esta semana",
        emptyDesc: "Programe tareas para la semana del {{start}} al {{end}} para ver la distribución de su tiempo.",
        timePlanned: "Tiempo programado esta semana",
        hours_one: "{{count}} hora",
        hours_other: "{{count}} horas",
        hoursShort: "h",
        weekRange: "Semana del {{start}} al {{end}}",
        mainFocus: "Enfoque principal",
        focusHours: "{{count}} hora dedicada a esta categoría.",
        focusHours_plural: "{{count}} horas dedicadas a esta categoría.",
        mainFocusDesc: "Categoría que consume más tempo",
        distribution: "Distribución por actividad",
        chartDuration: "Duración"
      },
      weather: {
        sunny: "Cielo despejado",
        mainlyClear: "Mayormente despejado",
        partlyCloudy: "Parcialmente nublado",
        overcast: "Cubierto",
        fog: "Niebla",
        depositingRimeFog: "Niebla helada",
        lightDrizzle: "Llovizna ligera",
        moderateDrizzle: "Llovizna moderada",
        denseDrizzle: "Llovizna densa",
        lightRain: "Lluvia débil",
        moderateRain: "Lluvia moderada",
        heavyRain: "Lluvia fuerte",
        lightSnow: "Nieve débil",
        moderateSnow: "Nieve moderada",
        heavySnow: "Nieve fuerte",
        lightShowers: "Chubascos de lluvia débiles",
        moderateShowers: "Chubascos de lluvia moderados",
        heavyShowers: "Chubascos de lluvia fuertes",
        thunderstorm: "Tormenta",
        thunderstormSlightHail: "Tormenta con granizo débil",
        thunderstormHeavyHail: "Tormenta con granizo fuerte",
        unknown: "Clima",
        refreshPosition: "Actualizar mi posición",
        locationRequired: "El permiso de localización fue denegado o no es compatible con su navegador."
      }
    }
  },
  it: {
    translation: {
      header: {
        title: "Planity",
        activeSession: "Sessione attiva",
        hello: "Ciao, {{name}}",
        logout: "Disconnetti",
        activateAlerts: "Attiva avvisi",
        lightMode: "Attiva modalità chiara",
        darkMode: "Attiva modalità scura"
      },
      dashboard: {
        myDay: "La Mia Giornata",
        tasksCount_one: "{{count}} attività pianificata",
        tasksCount_other: "{{count}} attività pianificate",
        addTask: "Aggiungi attività",
        planningTab: "Pianificazione",
        statsTab: "Statistiche"
      },
      dateSelector: {
        today: "Oggi",
        prevDay: "Giorno precedente",
        nextDay: "Giorno successivo"
      },
      modal: {
        addTitle: "Aggiungi blocco temporale",
        editTitle: "Modifica blocco",
        errorTitle: "Inserire un titolo.",
        errorTime: "Inserire l'ora di inizio e di fine.",
        errorTimeOrder: "L'ora di fine deve essere successiva all'ora di inizio.",
        errorRecurrence: "Selezionare almeno un giorno della settimana per la ricorrenza.",
        errorEndDateTime: "Inserire la data e l'ora di fine del tracciatore.",
        errorEndFuture: "La data di fine deve essere nel futuro.",
        errorSave: "Impossibile salvare il blocco temporale. Riprovare.",
        errorDelete: "Impossibile eliminare il blocco temporale.",
        confirmDelete: "Sei sicuro di voler eliminare questo blocco temporale?",
        labelTitle: "Titolo dell'attività / blocco",
        labelCategory: "Categoria",
        labelDescription: "Descrizione (opzionale)",
        labelStartTime: "Ora di inizio",
        labelEndTime: "Ora di fine",
        labelIsLongTerm: "Attività di più giorni (Tracciatore)",
        labelEndDateTime: "Data e ora di fine del tracciatore",
        labelRepeat: "Ripeti questa attività ogni settimana",
        labelDays: "Giorni della settimana",
        labelWeeks: "Per quante settimane?",
        maxWeeksNote: "Massimo 52 settimane (1 anno).",
        btnDelete: "Elimina",
        btnCancel: "Annulla",
        btnSaveAdd: "Aggiungi attività",
        btnSaveEdit: "Modifica attività",
        placeholderTitle: "es. Riunione del team SLAM",
        placeholderCategory: "Inserisci o scegli una categoria (es. SLAM, Sport...)",
        placeholderDescription: "Détails dell'attività, lista della spesa, note importanti..."
      },
      timeline: {
        emptyTitle: "Nessuna attività pianificata",
        emptyDesc: "La tua giornata è libera. Clicca su \"Aggiungi attività\" per pianificare il tuo primo blocco temporale.",
        planningView: "Pianificazione oraria",
        listView: "Elenco cronologico"
      },
      trackers: {
        title: "Tracciatori a Lunga Durata",
        expired: "Terminato!",
        remaining: "Tempo rimasto: {{time}}"
      },
      stats: {
        loading: "Caricamento statistiche...",
        error: "Errore nel recupero dei dati statistici.",
        emptyTitle: "Nessun dato questa settimana",
        emptyDesc: "Pianifica le attività per la settimana dal {{start}} al {{end}} per vedere la distribuzione del tuo tempo.",
        timePlanned: "Tempo pianificato questa settimana",
        hours_one: "{{count}} ora",
        hours_other: "{{count}} ore",
        hoursShort: "h",
        weekRange: "Settimana dal {{start}} al {{end}}",
        mainFocus: "Focus principale",
        focusHours: "{{count}} ora trascorsa su questa categoria.",
        focusHours_plural: "{{count}} ore trascorse su questa categoria.",
        mainFocusDesc: "Categoria che richiede più tempo",
        distribution: "Distribuzione per attività",
        chartDuration: "Durata"
      },
      weather: {
        sunny: "Cielo sereno",
        mainlyClear: "Prevalentemente sereno",
        partlyCloudy: "Parzialmente nuvoloso",
        overcast: "Coperto",
        fog: "Nebbia",
        depositingRimeFog: "Nebbia brinante",
        lightDrizzle: "Pioggerella leggera",
        moderateDrizzle: "Pioggerella moderata",
        denseDrizzle: "Pioggerella fitta",
        lightRain: "Pioggia debole",
        moderateRain: "Pioggia moderata",
        heavyRain: "Pioggia forte",
        lightSnow: "Neve debole",
        moderateSnow: "Neve moderata",
        heavySnow: "Neve forte",
        lightShowers: "Rovesci di pioggia deboli",
        moderateShowers: "Rovesci di pioggia moderati",
        heavyShowers: "Rovesci di pioggia forti",
        thunderstorm: "Temporale",
        thunderstormSlightHail: "Temporale con grandine debole",
        thunderstormHeavyHail: "Temporale con grandine forte",
        unknown: "Meteo",
        refreshPosition: "Aggiorna la mia posizione",
        locationRequired: "L'autorizzazione alla geolocalizzazione è stata negata o non è supportata dal browser."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "fr",
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
