/** Semana operativa viernes–jueves; el cálculo utiliza sólo fechas de calendario. */
export function financialWeek(dateString) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString||'')))return null;
  const date=new Date(`${dateString}T12:00:00Z`);
  if(Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==dateString)return null;
  date.setUTCDate(date.getUTCDate()-((date.getUTCDay()-5+7)%7));
  const inicio=date.toISOString().slice(0,10);
  date.setUTCDate(date.getUTCDate()+6);
  return {inicio,fin:date.toISOString().slice(0,10)};
}
