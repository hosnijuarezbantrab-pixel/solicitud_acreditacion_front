import { createContext, useContext, useReducer, useCallback } from 'react';
const init = {
  usuario: { nombre:'JLOPEZ', agencia:'AGN-001', agencia_nombre:'Agencia Central' },
  accionista: null, accionistaLoading: false, accionistaError: null,
  notifications: [],
  summary: { conflicto: null, limitaciones: [], enfermedad: '', acompanante: null },
};
export const A = {
  SET_ACC:'SET_ACC', CLEAR_ACC:'CLEAR_ACC', ACC_LOADING:'ACC_LOADING', ACC_ERROR:'ACC_ERROR',
  ADD_NOTIF:'ADD_NOTIF', DEL_NOTIF:'DEL_NOTIF',
  SET_SUMMARY:'SET_SUMMARY',
};

function reducer(s, {type:t,payload:p}) {
  switch(t){
    case A.SET_ACC:      return{...s,accionista:p,accionistaLoading:false,accionistaError:null};
    case A.CLEAR_ACC:    return{...s,accionista:null,accionistaError:null};
    case A.ACC_LOADING:  return{...s,accionistaLoading:p};
    case A.ACC_ERROR:    return{...s,accionistaError:p,accionistaLoading:false};
    case A.ADD_NOTIF:    return{...s,notifications:[...s.notifications,{id:Date.now(),...p}]};
    case A.DEL_NOTIF:    return{...s,notifications:s.notifications.filter(n=>n.id!==p)};
    case A.SET_SUMMARY:  return{...s,summary:{...s.summary,...p}};
    default: return s;
  }
}
const Ctx = createContext(null);
export function AppProvider({children}) {
  const [state, dispatch] = useReducer(reducer, init);
  // G-16 FIX: persist usuario to sessionStorage so api.js can include X-Usuario header
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('usuario_actual', init.usuario.nombre);
  }
  const notify = useCallback((type, message, ms=3500) => {
    const id = Date.now();
    dispatch({type:A.ADD_NOTIF,payload:{id,type,message}});
    setTimeout(()=>dispatch({type:A.DEL_NOTIF,payload:id}), ms);
  }, []);
  const setSummary = useCallback((data) => {
    dispatch({type:A.SET_SUMMARY,payload:data});
  }, []);
  return <Ctx.Provider value={{state,dispatch,notify,setSummary}}>{children}</Ctx.Provider>;
}

export const useApp = () => { const c=useContext(Ctx); if(!c) throw new Error('useApp outside provider'); return c; };
