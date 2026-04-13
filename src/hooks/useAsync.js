import { useState, useCallback } from 'react';
export function useAsync(fn) {
  const [state, set] = useState({ data:null, loading:false, error:null });
  const execute = useCallback(async (...args) => {
    set({ data:null, loading:true, error:null });
    try { const data = await fn(...args); set({ data, loading:false, error:null }); return data; }
    catch(e) { set({ data:null, loading:false, error:e.message||'Error' }); throw e; }
  }, [fn]);
  const reset = useCallback(() => set({ data:null, loading:false, error:null }), []);
  return { ...state, execute, reset };
}
