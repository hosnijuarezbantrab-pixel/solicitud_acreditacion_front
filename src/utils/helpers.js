export const fmt   = (n) => `Q${Number(n).toLocaleString('es-GT',{minimumFractionDigits:2})}`;
export const maskDPI = (d) => d ? `${d.slice(0,4)}•••${d.slice(-4)}` : '';
export const initials = (n='') => { const p=n.trim().split(/\s+/); return((p[0]?.[0]||'')+(p[1]?.[0]||p[0]?.[1]||'')).toUpperCase(); };
export const delay  = (ms=700) => new Promise(r=>setTimeout(r,ms));
export const genRef = (pfx='REF') => `${pfx}-${Math.floor(Math.random()*90000+10000)}`;
export const today  = () => new Date().toLocaleDateString('es-GT');
export const inRange = (dateStr, desde, hasta) => {
  if (!dateStr || !desde || !hasta) return true;
  const d = new Date(dateStr), f = new Date(desde), h = new Date(hasta);
  return d >= f && d <= h;
};
export const ESTATUS = {
  1:{label:'Activo',color:'green'}, 11:{label:'Activo-Nuevo',color:'teal'},
  21:{label:'Activo',color:'green'}, 31:{label:'Suspendido',color:'amber'}, 99:{label:'Inactivo',color:'gray'}
};
export const getEstatus = (c) => ESTATUS[c]||{label:`Est.${c}`,color:'gray'};
// ACCFRM0080 — Estado expediente labels
export const EST_EXP = {
  1:{label:'Entregado',color:'teal'}, 2:{label:'Recibido',color:'green'},
  4:{label:'Aprobado',color:'blue'}, 5:{label:'En Revisión',color:'amber'},
  6:{label:'Cred. a Emitir',color:'pink'}, 8:{label:'Cred. Entregada',color:'green'},
  10:{label:'Denegado',color:'red'}
};
export const getEstExp = (c) => EST_EXP[Number(c)]||{label:`Est.${c}`,color:'gray'};
