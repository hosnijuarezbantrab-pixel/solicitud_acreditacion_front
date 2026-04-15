import { useState } from 'react';
import { Button, Input, Select, Alert, Toggle } from '../../ui/UI.jsx';
import { SectionTitle, FieldRow } from '../../ui/Card.jsx';
import { actualizarConflictoInteres } from '../../../services/api.js';
import { useApp } from '../../../context/AppContext.jsx';
import s from './ConflictoInteresForm.module.css';

function Seccion({ title, sub, on, onChange, children }) {
  return (
    <div className={s.sec}>
      <div className={s.swRow} style={{ borderBottom: on ? '1px solid var(--gray-100)' : 'none' }}>
        <div><div className={s.swLbl}>{title}</div><div className={s.swSub}>{sub}</div></div>
        <Toggle checked={on} onChange={onChange} />
      </div>
      {on && <div className={s.swBody}>{children}</div>}
    </div>
  );
}

export default function ConflictoInteresForm({ acc }) {
  const { notify } = useApp();
  const [prov, setProv] = useState(acc.proveedor_bantrab === 'S');
  const [emp, setEmp] = useState(acc.empleado_bantrab === 'S');
  const [par, setPar] = useState(acc.pariente_id === 'S');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await actualizarConflictoInteres(acc.codigo, { proveedor_bantrab: prov ? 'S' : 'N', empleado_bantrab: emp ? 'S' : 'N', pariente_id: par ? 'S' : 'N' });
      notify('success', 'Información de conflicto de interés guardada correctamente.');
    } catch (e) { notify('error', e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <Alert type="warning">Esta información es requerida por normativa interna. Los campos adicionales se habilitan según la respuesta seleccionada.</Alert>
      <SectionTitle icon="⚖️">Relación con Bantrab</SectionTitle>
      <Seccion title="¿Es proveedor de Bantrab?" sub="Incluye cualquier tipo de servicio o producto" on={prov} onChange={setProv}>
        <FieldRow cols={2}><Input label="Nombre / Razón Social *" placeholder="Razón social" /><Input label="Producto o Servicio *" placeholder="Descripción" /></FieldRow>
        <FieldRow cols={2}><Input label="Monto Aproximado (Q) *" type="number" placeholder="0.00" /><Select label="Frecuencia *"><option>Mensual</option><option>Trimestral</option><option>Anual</option></Select></FieldRow>
      </Seccion>
      <Seccion title="¿Es empleado de Bantrab?" sub="Personal de planta, temporal o por honorarios" on={emp} onChange={setEmp}>
        <FieldRow cols={3}><Input label="Área / Departamento *" placeholder="Ej: RRHH" /><Input label="Puesto *" placeholder="Título del puesto" /><Input label="Fecha de Ingreso *" type="date" /></FieldRow>
      </Seccion>
      <Seccion title="¿Tiene parentesco con algún funcionario o directivo?" sub="Cónyuge, padres, hijos, hermanos u otros hasta 4to. grado" on={par} onChange={setPar}>
        <FieldRow cols={2}><Input label="Nombre del Funcionario *" placeholder="Nombre completo" /><Input label="Puesto que Ocupa *" placeholder="Cargo o puesto" /></FieldRow>
      </Seccion>
    </div>
  );
}
