/** Calendar dates are expressed in Tijuana; before 05:00 belongs to the previous operating day. */
export function financialDate(now=new Date()) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 const day=new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
 if(Number(parts.hour)<5)day.setUTCDate(day.getUTCDate()-1);
 return day.toISOString().slice(0,10);
}
