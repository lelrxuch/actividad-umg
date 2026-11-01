# ANEXO 1 — Documento de Constitución del Equipo

---

## 1. Identificación del Equipo

| | |
|---|---|
| **Nombre del equipo** | Grupo 5 |
| **Proyecto asignado** | Sistema de gestión de becas por el MINEDUC |
| **Nombre del producto** | Plataforma Nacional para la Gestión Integral de Becas |
| **Curso** | 0910-037 Análisis de Sistemas II — 8º Ciclo |
| **Catedrático / Product Owner / Scrum Master** | Ing. Mario Fuentes |
| **Repositorio** | `github.com/lelrxuch/actividad-umg` |
| **Tablero** | Jira, proyecto SCRUM |
| **Fecha de actualización** | 31/10/2026 |

---

## 2. Integrantes del Equipo

| Nombre completo | Rol / Clave funcional | Correo electrónico | Teléfono |
|---|---|---|---|
| Jonatan Santiago | Desarrollador Backend | jsantiagoi@miumg.edu.gt | 5590-3048 |
| Marco Antonio Rolando Corado García | QA / Tester | mcoradog5@miumg.edu.gt | 4699-3417 |
| Brayan David Sujuy Hernández | Desarrollador Frontend | bsujuyh@miumg.edu.gt | 3422-2804 |
| José Daniel Pereira Cabrera | Desarrollador Backend | | |
| Cristopher Isaí Contreras Salazar | Arquitecto de Infraestructura | | |

Los datos de contacto los llena cada integrante a mano.

---

## 3. Objetivo General y Objetivos Específicos (criterios SMART)

### Objetivo General

Diseñar, desarrollar y entregar, al finalizar el semestre académico, un producto
mínimo viable de una plataforma web para el Ministerio de Educación que
centralice la administración de convocatorias, estudiantes, solicitudes,
documentación, evaluaciones, resoluciones y seguimiento de becas, aplicando
Scrum, una arquitectura de software técnicamente justificada, principios SOLID,
patrones de diseño y prácticas de calidad verificables mediante pruebas y
aceptación del Product Owner.

### Objetivo Específico 1

Levantar, analizar, priorizar y mantener actualizado durante el semestre el 100 %
de los requerimientos funcionales y no funcionales del MVP en un Product
Backlog, documentándolos mediante historias de usuario con criterios de
aceptación y validándolos con el Product Owner al cierre de cada Sprint.

**Avance verificable:** 7 Epics desglosados en 27 Historias (SCRUM-32 a
SCRUM-58) más las de cuentas, cada una con criterios de aceptación, en
`docs/anexo-4-vision-y-backlog.md`. 30 requisitos no funcionales registrados con
su estado.

### Objetivo Específico 2

Definir e implementar, antes de la entrega final, una arquitectura de software
mantenible y escalable que incorpore como mínimo dos patrones creacionales, dos
estructurales y dos de comportamiento, justificando técnicamente cada elección y
representando la solución mediante los diagramas UML y documentos de diseño
requeridos.

**Avance verificable:** **Cumplido.** Arquitectura N-Layer con cinco trade-offs
declarados; **seis patrones** implementados y probados (2 creacionales, 2
estructurales, 2 de comportamiento); cuatro diagramas en
`docs/anexo-5-documento-de-diseno.md`, validados con el parser de Mermaid.

### Objetivo Específico 3

Entregar al final de cada Sprint un incremento funcional y demostrable que cumpla
el 100 % de los criterios de aceptación comprometidos y la Definición de Hecho,
incluyendo pruebas unitarias, de integración y de aceptación, revisión de código
mediante Pull Request, documentación actualizada y trazabilidad completa en el
repositorio Git.

**Avance verificable:** 353 pruebas en el backend y 85 en el frontend, todas
contra código de producción; 26 endpoints; todo integrado por Pull Request con
aprobación de otro miembro.

**Lo que NO se cumple de este objetivo, y hay que decirlo:**

El punto 7 del DoD exige despliegue en un entorno de pruebas y verificación
   del Product Owner. **No existe entorno de Staging**, de modo que ninguna
   Historia ha cumplido el 100 % de la Definición de Hecho. El detalle y las dos
   salidas posibles están en `docs/anexo-6-plan-de-calidad.md` §4.4.

Hasta el 22/10/2026 tampoco se cumplía en el frontend: sus 2 archivos de prueba
no importaban código de producción y no podían fallar. Se reemplazaron por
pruebas reales (PR #34 y siguientes); el detalle está en
`docs/anexo-6-plan-de-calidad.md` §4.5.

---

## 4. Asignación de Roles — Matriz RACI

**Fase 1 — Documentación, Anexos y Diagramación.**
**R** Responsable · **A** Aprobador · **C** Consultado · **I** Informado

| Actividad / Entregable | Cristopher Contreras (Arq. Infraestructura) | Jonatan Santiago (Dev. Backend) | José Pereira (Dev. Backend) | Brayan Sujuy (Dev. Frontend) | Marco Corado (QA / Tester) |
|---|:---:|:---:|:---:|:---:|:---:|
| 1.1 Llenado de Anexo 1 (Constitución) y Anexo 3 (Políticas) | **A** | R | R | R | R |
| 1.2 Visión del Producto y Backlog Inicial (Anexo 4) | C | **A** | R | R | C |
| 1.3 Diagrama de Casos de Uso (Anexo 5) | C | R | R | **A** | C |
| 1.4 Arquitectura en Capas y Diagrama de Componentes (Anexo 5) | **A** | C | C | I | I |
| 1.5 Diagrama de Clases del Dominio y Patrones (Anexo 5) | C | **A** | R | I | C |
| 1.6 Modelo Entidad-Relación (DER) para PostgreSQL | C | R | **A** | I | C |
| 1.7 Plan de Aseguramiento de Calidad — QAP (Anexo 6) | I | I | I | I | **A** |
| 1.8 Plan de Pruebas Ágil (Anexo 7) | I | C | C | C | **A** |
| 1.9 Configuración del Repositorio Git y Tablero Jira | **A** | C | C | I | I |

---

## 5. Protocolo de Comunicación Única

**Plataformas:** Discord, WhatsApp y Jira.

1. **Discord** se usa para las reuniones del equipo (Daily los lunes y
   miércoles).
2. **WhatsApp** se usa **únicamente** para avisos, consultas rápidas y
   coordinación inmediata.
3. **Toda tarea, responsable, fecha y avance se registra en Jira.** Lo que no
   está en Jira no existe para efectos de seguimiento.
4. Los mensajes deben ser claros, respetuosos y relacionados con el proyecto.
5. Cada integrante confirma la recepción de los avisos importantes.
6. Los bloqueos o retrasos se comunican **de inmediato** y se actualizan en Jira.

**Agregado por el equipo:** la discusión técnica de un cambio concreto va en el
**Pull Request**, no en WhatsApp, para que quede junto al código al que se
refiere y la pueda leer quien llegue después.

---

## 6. Cronograma del Proyecto (WBS)

Se reproduce el cronograma del enunciado y se agrega una columna con el estado
real, verificado contra el repositorio. No se alteran las fechas comprometidas:
lo que se agrega es la verdad sobre su cumplimiento.

### Fase 1 — Inicio, planificación y diseño (Sprint 0 / Sprint 1)
**Hito 1: Aprobación de Arquitectura y Anexos**

| WBS | Tarea | Fecha | Responsable | Estado real al 22/10/2026 |
|---|---|---|---|---|
| 1.1 | Anexo 1 (Constitución) y Anexo 3 (Políticas) | 10/Feb/2026 | Brayan Sujuy | Borrador listo; faltan 3 decisiones del equipo y las firmas |
| 1.2 | Visión del Producto y Backlog (Anexo 4) | 12/Feb/2026 | Jonatan Santiago | **Entregado** |
| 1.3 | Diagramación UML (Casos de Uso, Componentes, Clases) | 16/Feb/2026 | Brayan Sujuy / Jonatan S. | **Entregado**, en Mermaid dentro de `/docs` |
| 1.4 | Modelo Entidad-Relación (DER PostgreSQL) | 18/Feb/2026 | José Pereira | **Entregado** con una desviación: ver nota abajo |
| 1.5 | Planes QA y Pruebas (Anexos 6 y 7) | 20/Feb/2026 | Marco Corado | **Entregados** |
| 1.6 | Repositorio GitHub y Tablero Jira | 22/Feb/2026 | Cristopher Contreras | **Entregado.** `main` protegida, `develop` por defecto, Jira en uso |

> **Desviación en 1.4.** El criterio de aceptación decía *"script .sql base
> creado y validado con tipos **UUID**"*. El esquema usa `SERIAL` e `INTEGER`,
> no UUID: **no hay un solo UUID en el proyecto**. Se decidió no migrar, porque
> cambiar el tipo de las claves obliga a tocar todas las llaves foráneas, los
> repositorios y las 353 pruebas del backend, a cambio de un beneficio que este sistema no
> necesita (los identificadores no se exponen a terceros ni se generan de forma
> distribuida). **Queda a decisión del Product Owner** si acepta la desviación o
> exige la migración.

### Fase 2 — Desarrollo del MVP, módulos base (Sprint 2)
**Hito 2: MVP Funcional — Registro y Convocatorias**

| WBS | Tarea | Fecha | Responsable | Estado real |
|---|---|---|---|---|
| 2.1 | Despliegue inicial de esquemas en PostgreSQL | 26/Feb/2026 | José Pereira | **Entregado.** 5 tablas, esquema idempotente |
| 2.2 | Autenticación, JWT y Registro | 03/Mar/2026 | Jonatan Santiago | **Entregado.** 26 pruebas |
| 2.3 | Layout base, Login y Registro (frontend) | 06/Mar/2026 | Brayan Sujuy | **Entregado**, consumiendo la API real |
| 2.4 | Gestión de Convocatorias (CRUD Admin) | 12/Mar/2026 | José Pereira / Brayan S. | **Backend entregado** (30 pruebas). **Falta la pantalla** |
| 2.5 | Pruebas unitarias de Autenticación y Convocatorias | 15/Mar/2026 | Marco Corado | **Entregado** |

### Fase 3 — Gestión de solicitudes y documentos (Sprint 3)
**Hito 3: Flujo Completo de Postulación del Estudiante**

| WBS | Tarea | Fecha | Responsable | Estado real |
|---|---|---|---|---|
| 3.1 | Lógica de Solicitudes y patrón State | 20/Mar/2026 | Jonatan Santiago | **Entregado.** 5 estados, 27 pruebas |
| 3.2 | Carga de archivos y patrón Proxy | 25/Mar/2026 | Cristopher Contreras | **Entregado.** Los archivos van a `backend/uploads/`, no a `/storage/uploads` |
| 3.3 | Adaptador de validaciones (patrón Adapter) | 28/Mar/2026 | José Pereira | **Entregado y conectado al envío** desde SCRUM-38 (PR #36). El sistema no guardaba el CUI en ninguna tabla: ahora se pide al enviar y queda en `solicitudes.cui` |
| 3.4 | Formulario multipaso de postulación (frontend) | 02/Abr/2026 | Brayan Sujuy | **Entregado** como pantalla única, no multipaso (PR #34 y #35): convocatorias, expediente con subida de documentos, CUI y envío |
| 3.5 | Pruebas de integración y mantenibilidad (SOLID) | 06/Abr/2026 | Marco Corado | **Entregado** |

### Fase 4 — Evaluación, reportes y calidad (Sprint 4)
**Hito 4: Panel Evaluador y Reportes MINEDUC**

| WBS | Tarea | Fecha | Responsable | Estado real |
|---|---|---|---|---|
| 4.1 | Módulo de Evaluación para Comité | 12/Abr/2026 | Jonatan S. / Brayan S. | **Pendiente.** El ciclo de estados existe; faltan criterios, puntajes y cupo |
| 4.2 | Notificaciones y patrón Observer | 16/Abr/2026 | Cristopher Contreras | **Entregado** (PR #54, requerimiento R2): aviso en la aplicación en cada cambio de estado. El envío por correo queda fuera |
| 4.3 | Módulo de Reportes y Estadísticas | 20/Abr/2026 | José Pereira / Brayan S. | **Pendiente** |
| 4.4 | Pruebas de Sistema, Aceptación (UAT) y corrección | 25/Abr/2026 | Marco Corado | Recorrido automatizado de 91 verificaciones contra PostgreSQL en cada PR; UAT formal pendiente |

### Fase 5 — Despliegue, cierre y entrega final
**Hito 5: Presentación Final ante el Product Owner**

| WBS | Tarea | Fecha | Responsable | Estado real |
|---|---|---|---|---|
| 5.1 | Despliegue en entorno de Staging / Pruebas | 28/Abr/2026 | Cristopher Contreras | **Entregado** en Render (PR #63): `becas-web.onrender.com` |
| 5.2 | Manuales Técnico y de Usuario | 02/May/2026 | Marco Corado / Brayan S. | **Entregados.** Manual de Usuario v1.3 con estudiante, evaluador, autoridad y administrador (PR #61) |
| 5.3 | Auditoría del repositorio y limpieza de ramas | 05/May/2026 | Cristopher Contreras | **Entregado.** `main` actualizada desde `develop` (PR #62); queda la integración final de la documentación |
| 5.4 | Demostración final y defensa | 10/May/2026 | Todo el equipo | **Realizada** el 31/10/2026. Ver minuta en el Anexo 2 |

### 6.1 Nota sobre las fechas

Las fechas de este cronograma son las del enunciado y van de febrero a mayo de
2026. **Todas están vencidas** a la fecha de actualización de este documento. Se
reproducen sin alterarlas porque son el compromiso original y modificarlas
borraría la trazabilidad de lo que se planificó.

No se re-planificó: el proyecto se entregó y defendió el 31/10/2026.

---

## 7. Compromiso del equipo

Los integrantes firman el ANEXO 3 (Política de Trabajo en Grupo) como señal de
aceptación de las normas, el proceso de resolución de conflictos y las sanciones
acordadas.

---

*Documento sujeto a control de versiones en el repositorio del proyecto.*
