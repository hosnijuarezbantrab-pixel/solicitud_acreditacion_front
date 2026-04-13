import { useState, useCallback, useEffect } from 'react';
import DpiBuscador from '../components/modules/accionista/DpiBuscador.jsx';
import AccionistaHeader from '../components/modules/accionista/AccionistaHeader.jsx';
import DatosPersonalesForm from '../components/modules/accionista/DatosPersonalesForm.jsx';
import ConflictoInteresForm from '../components/modules/accionista/ConflictoInteresForm.jsx';
import TitulosGrid from '../components/modules/accionista/TitulosGrid.jsx';
import ParticipacionForm from '../components/modules/accionista/ParticipacionForm.jsx';
import SelectorForma from '../components/modules/asamblea/SelectorForma.jsx';
import { Card, CardHeader, CardBody } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/UI.jsx';
import { getAccionistaPorDPI, getAsambleasActivas } from '../services/api.js';
import { useApp, A } from '../context/AppContext.jsx';
import s from './ConsultaPage.module.css';

const TABS = [
  { key: 'datos', label: 'Datos Personales', icon: '👤' },
  { key: 'conflicto', label: 'Conflicto de Interés', icon: '⚖️' },
  { key: 'titulos', label: 'Títulos Pendientes', icon: '📜' },
  { key: 'participacion', label: 'Info. Complementaria', icon: '♿' },
];

export default function ConsultaPage() {
  const { state, dispatch, notify } = useApp();
  const { accionista, accionistaLoading, accionistaError } = state;

  const [tab, setTab] = useState('datos');
  const [acred, setAcred] = useState(false);
  const [asambleas, setAsambleas] = useState([]);

  useEffect(() => {
    getAsambleasActivas().then(setAsambleas).catch(() => { });
  }, []);

  const handleSearch = useCallback(async (dpi) => {
    dispatch({ type: A.ACC_LOADING, payload: true });
    try {
      const data = await getAccionistaPorDPI(dpi);
      dispatch({ type: A.SET_ACC, payload: data });
      setTab('datos');
      setAcred(false);
      notify('success', 'Accionista encontrado correctamente.');
    } catch (e) {
      dispatch({ type: A.ACC_ERROR, payload: e.message });
      notify('error', e.message);
    }
  }, [dispatch, notify]);

  const handleReset = useCallback(() => {
    dispatch({ type: A.CLEAR_ACC });
    setAcred(false);
  }, [dispatch]);

  return (
    <div>
      {/* ── Page header ── */}
      <div className={s.hdrRow}>
        <div>
          <div className={s.breadcrumb}>
            Sistema de Accionistas › Consulta y Actualización
          </div>
          <h1 className={s.title}>
            <span className={s.tDark}>Módulo&nbsp;</span>
            <span className={s.tTeal}>de&nbsp;</span>
            <span className={s.tGold}>Accionistas</span>
          </h1>
        </div>
        {accionista && (
          <Button variant="secondary" onClick={handleReset}>🔄 Nueva Consulta</Button>
        )}
      </div>

      {/* ── DPI Buscador ── */}
      <DpiBuscador
        onSearch={handleSearch}
        loading={accionistaLoading}
        error={accionistaError}
      />

      {/* ── Accionista encontrado ── */}
      {accionista && !acred && (
        <>
          <AccionistaHeader
            acc={accionista}
            onAccreditar={() => setAcred(true)}
          />

          {/* Tabs */}
          <div className={s.tabsBar}>
            {TABS.map(t => (
              <button
                key={t.key}
                className={[s.tab, tab === t.key ? s.tabAct : ''].join(' ')}
                onClick={() => setTab(t.key)}
              >
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          <Card style={{ borderRadius: 20 }}>
            <CardBody>
              {tab === 'datos' && <DatosPersonalesForm acc={accionista} />}
              {tab === 'conflicto' && <ConflictoInteresForm acc={accionista} />}
              {tab === 'titulos' && <TitulosGrid accId={accionista.codigo} />}
              {tab === 'participacion' && (
                <ParticipacionForm acc={accionista} />
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* ── Vista de Acreditación ── */}
      {accionista && acred && (
        <>
          <div className={s.acredBar}>
            <Button variant="ghost" size="sm" onClick={() => setAcred(false)}>
              ← Volver al Perfil
            </Button>
            <div className={s.acredBarDiv} />
            <span className={s.acredBarTitle}>
              🎫 Acreditación en Asamblea — {accionista.nombre}
            </span>
          </div>

          <Card style={{ borderRadius: 20 }}>
            <CardHeader
              title="🎫 Módulo de Acreditación"
              actions={
                <Button variant="ghost" size="sm" onClick={() => setAcred(false)}>✕</Button>
              }
            />
            <CardBody>
              <SelectorForma
                acc={accionista}
                asambleas={asambleas}
                onClose={() => { setAcred(false); handleReset(); }}
              />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
