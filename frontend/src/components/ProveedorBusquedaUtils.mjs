/** Búsqueda local y segura: solo devuelve proveedores existentes en el catálogo. */
export function normalizarProveedor(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distanciaEdicion(a, b, limite = 2) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let anterior = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=1;i<=a.length;i++) {
    const actual=[i];
    for (let j=1;j<=b.length;j++) {
      actual[j]=Math.min(actual[j-1]+1,anterior[j]+1,anterior[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    if (Math.min(...actual)>limite) return limite+1;
    anterior=actual;
  }
  return anterior[b.length];
}

/** Devuelve como máximo 5 coincidencias, priorizando exactas y prefijos. */
export function sugerirProveedores(proveedores, busqueda, limite=5) {
  const q=normalizarProveedor(busqueda);
  if (!q) return [];
  const candidatos=(Array.isArray(proveedores)?proveedores:[])
    .filter(p=>p && p.activo!==false && p.activo!==0 && p.nombre)
    .map(p=>{
      const nombre=normalizarProveedor(p.nombre);
      let puntaje=Infinity;
      if(nombre===q) puntaje=0;
      else if(nombre.startsWith(q)) puntaje=1;
      else if(nombre.split(' ').some(parte=>parte.startsWith(q))) puntaje=2;
      else if(nombre.includes(q)) puntaje=3;
      else if(q.length>=4) {
        const d=distanciaEdicion(nombre.slice(0,q.length),q,2);
        if(d<=2) puntaje=4+d;
      }
      return {proveedor:p,puntaje};
    })
    .filter(x=>x.puntaje!==Infinity)
    .sort((a,b)=>a.puntaje-b.puntaje||String(a.proveedor.nombre).localeCompare(String(b.proveedor.nombre),'es'));
  const vistos=new Set();
  return candidatos.filter(x=>{
    const n=normalizarProveedor(x.proveedor.nombre);
    if(vistos.has(n))return false;
    vistos.add(n);return true;
  }).slice(0,Math.max(1,Math.min(5,limite))).map(x=>x.proveedor);
}
