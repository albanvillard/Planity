/**
 * Retourne la date d'aujourd'hui au format "YYYY-MM-DD" local.
 */
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Décale une date au format "YYYY-MM-DD" d'un certain nombre de jours.
 * 
 * @param {string} dateStr Date de départ.
 * @param {number} days Nombre de jours à ajouter (ou soustraire si négatif).
 */
export function shiftDate(dateStr, days) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calcule le lundi et le dimanche de la semaine d'une date donnée au format "YYYY-MM-DD".
 * 
 * @param {string} dateStr Date de départ.
 */
export function getWeekRange(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  const dayOfWeek = date.getDay();
  // Lundi = 1, Dimanche = 0
  const diffToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayVal = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayVal}`;
  };
  
  return {
    start: format(monday),
    end: format(sunday)
  };
}
