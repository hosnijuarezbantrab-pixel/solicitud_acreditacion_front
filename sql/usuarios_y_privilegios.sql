-- ============================================================
--  DDL DE USUARIOS Y PRIVILEGIOS — ORACLE 19c
--  Sistema Core Accionistas + Módulo Firma Digital
--
--  Ejecutar como: SYS o DBA con SYSDBA
--  Esquema propietario de los objetos: APP_ACCIONISTAS (dueño real)
--
--  Usuarios de aplicación:
--    USR_CORE_ACC  → Core Accionistas (backend Node/Vite → API REST)
--    USR_FIRMA_DIG → Firma Digital (NestJS backend)
--
--  Convenciones:
--    - Passwords deben reemplazarse por valores del vault corporativo
--    - Prefijo de perfil: PERFIL_APP (sin CONNECT resource directo)
--    - Todos los grants son sobre objetos del esquema APP_ACCIONISTAS
--    - Se evita ANY privilege salvo justificación explícita
-- ============================================================


-- ============================================================
-- SECCIÓN 0 — PERFIL DE SEGURIDAD COMPARTIDO
-- ============================================================

-- Perfil que limita intentos fallidos y sesiones concurrentes
-- para cuentas de aplicación (sin expiración de password,
-- gestionada por vault/rotación externa).
CREATE PROFILE PERFIL_APP LIMIT
  FAILED_LOGIN_ATTEMPTS   5
  PASSWORD_LOCK_TIME      1/24        -- 1 hora
  PASSWORD_LIFE_TIME      UNLIMITED   -- rotación via vault externo
  PASSWORD_REUSE_TIME     365
  PASSWORD_REUSE_MAX      6
  SESSIONS_PER_USER       50          -- límite de conexiones por pool
  IDLE_TIME               30          -- minutos de inactividad
  CONNECT_TIME            UNLIMITED;


-- ============================================================
-- SECCIÓN 1 — USUARIO: USR_CORE_ACC
--             Core Accionistas — lectura/escritura operativa
-- ============================================================

CREATE USER USR_CORE_ACC
  IDENTIFIED BY "<<REEMPLAZAR_PASSWORD_VAULT>>"
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA 0 ON USERS          -- sin quota: solo accede a objetos ajenos
  PROFILE PERFIL_APP
  ACCOUNT UNLOCK;

COMMENT ON USER USR_CORE_ACC IS
  'Usuario de aplicacion - Core Accionistas (ACCFRM0080/0081/0803). '
  'Solo accede a objetos del esquema APP_ACCIONISTAS.';

-- Privilegios de sistema mínimos
GRANT CREATE SESSION TO USR_CORE_ACC;

-- ──────────────────────────────────────────────────────────
-- 1A. Tablas EXISTENTES (esquema propietario APP_ACCIONISTAS)
--     Operaciones de lectura y escritura operativa
-- ──────────────────────────────────────────────────────────

-- Accionistas — lectura y actualización de datos personales/conflicto
GRANT SELECT, UPDATE ON APP_ACCIONISTAS.ACCACCIONISTA         TO USR_CORE_ACC;

-- Asambleas — lectura del catálogo activo
GRANT SELECT            ON APP_ACCIONISTAS.ACCASAMBLEA         TO USR_CORE_ACC;
GRANT SELECT            ON APP_ACCIONISTAS.ACCASAMBLEA_ACTUAL  TO USR_CORE_ACC;

-- Expedientes — CRUD completo (ACCFRM0080/0081)
GRANT SELECT, INSERT, UPDATE
                        ON APP_ACCIONISTAS.ACC_DETALLE_EXPEDIENTE   TO USR_CORE_ACC;
GRANT SELECT            ON APP_ACCIONISTAS.ACC_DETINVERSION_ASAMBLEA TO USR_CORE_ACC;
GRANT SELECT            ON APP_ACCIONISTAS.ACCASAMBLEA_DENEGADA     TO USR_CORE_ACC;
GRANT SELECT, INSERT    ON APP_ACCIONISTAS.ACC_MOVIMIENTO_ASAMBLEA  TO USR_CORE_ACC;

-- Catálogos — solo lectura
GRANT SELECT ON APP_ACCIONISTAS.ACCESTADO_EXPEDIENTE   TO USR_CORE_ACC;
GRANT SELECT ON APP_ACCIONISTAS.ACC_TIPODOCUMEN        TO USR_CORE_ACC;

-- Títulos — solo lectura
GRANT SELECT ON APP_ACCIONISTAS.ACC_DESCTRX_ACCIONES   TO USR_CORE_ACC;

-- ──────────────────────────────────────────────────────────
-- 1B. Tablas NUEVAS — Limitación Funcional y Acompañante
--     (HU-XXXX — creadas en esquema APP_ACCIONISTAS)
-- ──────────────────────────────────────────────────────────

GRANT SELECT            ON APP_ACCIONISTAS.CAT_LIMITACION_FUNCIONAL  TO USR_CORE_ACC;
GRANT SELECT, INSERT, UPDATE
                        ON APP_ACCIONISTAS.ACCIONISTA_LIMITACION     TO USR_CORE_ACC;
GRANT SELECT, INSERT, UPDATE
                        ON APP_ACCIONISTAS.ACCIONISTA_ACOMPANANTE    TO USR_CORE_ACC;
GRANT INSERT            ON APP_ACCIONISTAS.BITACORA_PARTICIPACION    TO USR_CORE_ACC;

-- ──────────────────────────────────────────────────────────
-- 1C. Secuencias de las tablas nuevas
-- ──────────────────────────────────────────────────────────
-- (Solo si las tablas usan secuencias explícitas en lugar de IDENTITY.
--  Con GENERATED ALWAYS AS IDENTITY el motor las gestiona; si se
--  generan secuencias separadas descomentarlas.)
-- GRANT SELECT ON APP_ACCIONISTAS.SEQ_ACCIONISTA_LIMITACION  TO USR_CORE_ACC;
-- GRANT SELECT ON APP_ACCIONISTAS.SEQ_ACCIONISTA_ACOMPANANTE TO USR_CORE_ACC;
-- GRANT SELECT ON APP_ACCIONISTAS.SEQ_BITACORA_PARTICIPACION TO USR_CORE_ACC;

-- ──────────────────────────────────────────────────────────
-- 1D. Stored Procedures / Funciones / Paquetes del Core
-- ──────────────────────────────────────────────────────────

GRANT EXECUTE ON APP_ACCIONISTAS.ACC_EXPEDIENTE_NUEVO   TO USR_CORE_ACC;
GRANT EXECUTE ON APP_ACCIONISTAS.ACC_VALIDA_ACCIONISTA  TO USR_CORE_ACC;
GRANT EXECUTE ON APP_ACCIONISTAS.ACC_OBTIENE_NOMBRE     TO USR_CORE_ACC;
GRANT EXECUTE ON APP_ACCIONISTAS.PKG_INFO_ACCIONISTA    TO USR_CORE_ACC;

-- ──────────────────────────────────────────────────────────
-- 1E. Sinónimos privados (evita calificar objetos con esquema)
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACCACCIONISTA
    FOR APP_ACCIONISTAS.ACCACCIONISTA;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACCASAMBLEA
    FOR APP_ACCIONISTAS.ACCASAMBLEA;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACCASAMBLEA_ACTUAL
    FOR APP_ACCIONISTAS.ACCASAMBLEA_ACTUAL;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_DETALLE_EXPEDIENTE
    FOR APP_ACCIONISTAS.ACC_DETALLE_EXPEDIENTE;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_DETINVERSION_ASAMBLEA
    FOR APP_ACCIONISTAS.ACC_DETINVERSION_ASAMBLEA;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACCASAMBLEA_DENEGADA
    FOR APP_ACCIONISTAS.ACCASAMBLEA_DENEGADA;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_MOVIMIENTO_ASAMBLEA
    FOR APP_ACCIONISTAS.ACC_MOVIMIENTO_ASAMBLEA;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACCESTADO_EXPEDIENTE
    FOR APP_ACCIONISTAS.ACCESTADO_EXPEDIENTE;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_TIPODOCUMEN
    FOR APP_ACCIONISTAS.ACC_TIPODOCUMEN;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_DESCTRX_ACCIONES
    FOR APP_ACCIONISTAS.ACC_DESCTRX_ACCIONES;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.CAT_LIMITACION_FUNCIONAL
    FOR APP_ACCIONISTAS.CAT_LIMITACION_FUNCIONAL;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACCIONISTA_LIMITACION
    FOR APP_ACCIONISTAS.ACCIONISTA_LIMITACION;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACCIONISTA_ACOMPANANTE
    FOR APP_ACCIONISTAS.ACCIONISTA_ACOMPANANTE;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.BITACORA_PARTICIPACION
    FOR APP_ACCIONISTAS.BITACORA_PARTICIPACION;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_EXPEDIENTE_NUEVO
    FOR APP_ACCIONISTAS.ACC_EXPEDIENTE_NUEVO;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_VALIDA_ACCIONISTA
    FOR APP_ACCIONISTAS.ACC_VALIDA_ACCIONISTA;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.ACC_OBTIENE_NOMBRE
    FOR APP_ACCIONISTAS.ACC_OBTIENE_NOMBRE;
CREATE OR REPLACE SYNONYM USR_CORE_ACC.PKG_INFO_ACCIONISTA
    FOR APP_ACCIONISTAS.PKG_INFO_ACCIONISTA;


-- ============================================================
-- SECCIÓN 2 — USUARIO: USR_FIRMA_DIG
--             Firma Digital — NestJS backend (módulo firma)
-- ============================================================

CREATE USER USR_FIRMA_DIG
  IDENTIFIED BY "<<REEMPLAZAR_PASSWORD_VAULT>>"
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA 0 ON USERS
  PROFILE PERFIL_APP
  ACCOUNT UNLOCK;

COMMENT ON USER USR_FIRMA_DIG IS
  'Usuario de aplicacion - Backend NestJS Firma Digital. '
  'Accede unicamente a TOKENS_FIRMA y FIRMA_ACCIONISTAS.';

GRANT CREATE SESSION TO USR_FIRMA_DIG;

-- ──────────────────────────────────────────────────────────
-- 2A. Tablas propias del módulo firma
--     (creadas en el mismo esquema propietario APP_ACCIONISTAS
--      o en un esquema dedicado FIRMA_DIG según arquitectura)
-- ──────────────────────────────────────────────────────────

-- Tokens OTP
-- SELECT: verificarToken, consultarEstadoToken, fallback Oracle
-- INSERT: generarToken
-- UPDATE: marcar USADO / EXPIRADO (handleTokenExpiration CronJob)
GRANT SELECT, INSERT, UPDATE ON APP_ACCIONISTAS.TOKENS_FIRMA       TO USR_FIRMA_DIG;

-- Firmas BLOB
-- SELECT: obtenerFirma (preview/descarga)
-- INSERT: guardarFirma
GRANT SELECT, INSERT          ON APP_ACCIONISTAS.FIRMA_ACCIONISTAS  TO USR_FIRMA_DIG;

-- Acceso de lectura a ACCACCIONISTA para validar que el accionista
-- existe al momento de verificarToken (referencia cruzada)
GRANT SELECT ON APP_ACCIONISTAS.ACCACCIONISTA TO USR_FIRMA_DIG;

-- ──────────────────────────────────────────────────────────
-- 2B. Stored Procedure de generación de token
--     (SP_GENERAR_TOKEN_FIRMA — definido en ddl_v3.sql)
-- ──────────────────────────────────────────────────────────
GRANT EXECUTE ON APP_ACCIONISTAS.SP_GENERAR_TOKEN_FIRMA TO USR_FIRMA_DIG;

-- ──────────────────────────────────────────────────────────
-- 2C. Privilegio para el scheduler job de limpieza de tokens
--     El job JOB_LIMPIAR_TOKENS_FIRMA se crea en el esquema
--     APP_ACCIONISTAS; USR_FIRMA_DIG solo necesita poder
--     habilitarlo/deshabilitarlo si aplica mantenimiento.
--     (CREATE JOB lo ejecuta APP_ACCIONISTAS o DBA en DDL;
--      no se delega a USR_FIRMA_DIG para reducir superficie.)
-- ──────────────────────────────────────────────────────────
-- GRANT MANAGE SCHEDULER TO USR_FIRMA_DIG;  -- NO: innecesario
-- El job ya existe; USR_FIRMA_DIG no lo crea ni administra.

-- ──────────────────────────────────────────────────────────
-- 2D. Secuencias (si aplica según versión del DDL)
-- ──────────────────────────────────────────────────────────
-- GRANT SELECT ON APP_ACCIONISTAS.SEQ_TOKENS_FIRMA      TO USR_FIRMA_DIG;
-- GRANT SELECT ON APP_ACCIONISTAS.SEQ_FIRMA_ACCIONISTAS TO USR_FIRMA_DIG;

-- ──────────────────────────────────────────────────────────
-- 2E. Sinónimos privados
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE SYNONYM USR_FIRMA_DIG.TOKENS_FIRMA
    FOR APP_ACCIONISTAS.TOKENS_FIRMA;
CREATE OR REPLACE SYNONYM USR_FIRMA_DIG.FIRMA_ACCIONISTAS
    FOR APP_ACCIONISTAS.FIRMA_ACCIONISTAS;
CREATE OR REPLACE SYNONYM USR_FIRMA_DIG.ACCACCIONISTA
    FOR APP_ACCIONISTAS.ACCACCIONISTA;
CREATE OR REPLACE SYNONYM USR_FIRMA_DIG.SP_GENERAR_TOKEN_FIRMA
    FOR APP_ACCIONISTAS.SP_GENERAR_TOKEN_FIRMA;


-- ============================================================
-- SECCIÓN 3 — AUDITORÍA Y MONITOREO
-- ============================================================

-- Habilitar auditoría de sesión para ambos usuarios
-- (requiere AUDIT_TRAIL = DB o DB,EXTENDED en SPFILE)
AUDIT CREATE SESSION BY USR_CORE_ACC  WHENEVER NOT SUCCESSFUL;
AUDIT CREATE SESSION BY USR_FIRMA_DIG WHENEVER NOT SUCCESSFUL;

-- Auditar DDL accidental (estos usuarios no deben ejecutar DDL)
AUDIT CREATE TABLE, DROP TABLE, ALTER TABLE
    BY USR_CORE_ACC  WHENEVER SUCCESSFUL;
AUDIT CREATE TABLE, DROP TABLE, ALTER TABLE
    BY USR_FIRMA_DIG WHENEVER SUCCESSFUL;

-- Auditar operaciones sobre FIRMA_ACCIONISTAS (dato sensible: imagen BLOB)
AUDIT INSERT, SELECT, UPDATE ON APP_ACCIONISTAS.FIRMA_ACCIONISTAS
    BY ACCESS WHENEVER SUCCESSFUL;

-- Auditar TOKENS_FIRMA (ciclo de vida del OTP)
AUDIT INSERT, UPDATE ON APP_ACCIONISTAS.TOKENS_FIRMA
    BY ACCESS WHENEVER SUCCESSFUL;


-- ============================================================
-- SECCIÓN 4 — VERIFICACIÓN POST-INSTALACIÓN
-- ============================================================
-- Ejecutar estas consultas para validar que los grants quedaron
-- correctamente asignados antes de levantar los servicios.

/*
-- 4A. Privilegios de sistema por usuario
SELECT GRANTEE, PRIVILEGE
FROM   DBA_SYS_PRIVS
WHERE  GRANTEE IN ('USR_CORE_ACC', 'USR_FIRMA_DIG')
ORDER  BY GRANTEE, PRIVILEGE;

-- 4B. Privilegios de objeto por usuario
SELECT GRANTEE, OWNER, TABLE_NAME, PRIVILEGE, GRANTABLE
FROM   DBA_TAB_PRIVS
WHERE  GRANTEE IN ('USR_CORE_ACC', 'USR_FIRMA_DIG')
ORDER  BY GRANTEE, OWNER, TABLE_NAME, PRIVILEGE;

-- 4C. Sinónimos creados
SELECT OWNER, SYNONYM_NAME, TABLE_OWNER, TABLE_NAME
FROM   DBA_SYNONYMS
WHERE  OWNER IN ('USR_CORE_ACC', 'USR_FIRMA_DIG')
ORDER  BY OWNER, SYNONYM_NAME;

-- 4D. Perfil de seguridad
SELECT USERNAME, PROFILE, ACCOUNT_STATUS, LOCK_DATE,
       CREATED, LAST_LOGIN
FROM   DBA_USERS
WHERE  USERNAME IN ('USR_CORE_ACC', 'USR_FIRMA_DIG');

-- 4E. Sesiones activas (post-arranque de servicios)
SELECT USERNAME, MACHINE, PROGRAM, STATUS, LOGON_TIME,
       COUNT(*) AS SESIONES
FROM   V$SESSION
WHERE  USERNAME IN ('USR_CORE_ACC', 'USR_FIRMA_DIG')
GROUP  BY USERNAME, MACHINE, PROGRAM, STATUS, LOGON_TIME
ORDER  BY USERNAME;

-- 4F. Auditoría reciente
SELECT DB_USER, USERHOST, ACTION_NAME, OBJ_NAME, TIMESTAMP
FROM   DBA_AUDIT_TRAIL
WHERE  DB_USER IN ('USR_CORE_ACC', 'USR_FIRMA_DIG')
  AND  TIMESTAMP >= SYSDATE - 1
ORDER  BY TIMESTAMP DESC;
*/


-- ============================================================
-- SECCIÓN 5 — REVOCAR / LIMPIEZA (rollback si se requiere)
-- ============================================================

/*
-- Ejecutar solo si se necesita revertir la instalación completa:

-- Revoke grants USR_CORE_ACC
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCACCIONISTA           FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCASAMBLEA             FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCASAMBLEA_ACTUAL      FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACC_DETALLE_EXPEDIENTE  FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACC_DETINVERSION_ASAMBLEA FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCASAMBLEA_DENEGADA    FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACC_MOVIMIENTO_ASAMBLEA FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCESTADO_EXPEDIENTE    FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACC_TIPODOCUMEN         FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACC_DESCTRX_ACCIONES    FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.CAT_LIMITACION_FUNCIONAL  FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCIONISTA_LIMITACION   FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCIONISTA_ACOMPANANTE  FROM USR_CORE_ACC;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.BITACORA_PARTICIPACION  FROM USR_CORE_ACC;
REVOKE EXECUTE ON APP_ACCIONISTAS.ACC_EXPEDIENTE_NUEVO           FROM USR_CORE_ACC;
REVOKE EXECUTE ON APP_ACCIONISTAS.ACC_VALIDA_ACCIONISTA          FROM USR_CORE_ACC;
REVOKE EXECUTE ON APP_ACCIONISTAS.ACC_OBTIENE_NOMBRE             FROM USR_CORE_ACC;
REVOKE EXECUTE ON APP_ACCIONISTAS.PKG_INFO_ACCIONISTA            FROM USR_CORE_ACC;
DROP USER USR_CORE_ACC CASCADE;

-- Revoke grants USR_FIRMA_DIG
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.TOKENS_FIRMA            FROM USR_FIRMA_DIG;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.FIRMA_ACCIONISTAS       FROM USR_FIRMA_DIG;
REVOKE ALL PRIVILEGES ON APP_ACCIONISTAS.ACCACCIONISTA           FROM USR_FIRMA_DIG;
REVOKE EXECUTE ON APP_ACCIONISTAS.SP_GENERAR_TOKEN_FIRMA         FROM USR_FIRMA_DIG;
DROP USER USR_FIRMA_DIG CASCADE;

DROP PROFILE PERFIL_APP;
*/
