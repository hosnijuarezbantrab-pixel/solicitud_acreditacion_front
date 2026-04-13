# Core Accionistas

Sistema de consulta, actualización y acreditación de accionistas — Core Access BT.

## Inicio rápido

```bash
npm install
npm run dev
# http://localhost:5173
```

## Demo

- DPI de prueba: cualquier cadena 5+ dígitos (ej: `2265780540101`)
- Supervisor: usuario `supervisor` / clave `1234`
- El token de firma se simula en mock: aparece el banner, el polling detecta
  "firma completada" automáticamente a los 5 s para poder probar el flujo completo.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_USE_MOCK` | `true` = mocks, `false` = backend real |
| `VITE_API_URL` | URL del API del Core |
| `VITE_FIRMA_API_URL` | URL del backend de firma NestJS |
| `VITE_FIRMA_CORE_KEY` | API key Sistema Core → backend firma |

## Cambios respecto al original

- **`src/services/api.js`** — agrega `generarTokenFirma` y `consultarEstadoFirma`
- **`src/components/modules/asamblea/AcreditacionWizard.jsx`** — Step 2 con banner
  de token OTP (código + countdown + polling), sin Términos y Condiciones, botón
  "Confirmar Acreditación" bloqueado hasta que el accionista complete la firma.
# solicitud_acreditacion_front
