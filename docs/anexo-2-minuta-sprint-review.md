# ANEXO 2 — Minuta de Reunión: Revisión de Sprint (Sprint Review)

Este archivo contiene la minuta de la Sprint Review del último Sprint, que fue
la defensa del proyecto ante el Product Owner, y al final la plantilla en
blanco para Sprints posteriores.

---

# Minuta — Sprint final: requerimientos nuevos del Product Owner

## 1. Información General

| | |
|---|---|
| **Nombre del Proyecto** | Plataforma Nacional para la Gestión Integral de Becas |
| **Número de Sprint** | Sprint final (requerimientos nuevos R1, R2 y R3) |
| **Período del Sprint** | 30/10/2026 – 31/10/2026 |
| **Fecha de la Reunión** | 31/10/2026 |

### Asistentes

| Rol | Nombre |
|---|---|
| Product Owner | Ing. Mario Fuentes |
| Scrum Master | Ing. Mario Fuentes |
| Development Team | Cristopher Isaí Contreras Salazar |
| Development Team | Jonatan Santiago |
| Development Team | José Daniel Pereira Cabrera |
| Development Team | Brayan David Sujuy Hernández |
| Development Team | Marco Antonio Rolando Corado García |
| Stakeholders invitados | No aplica |

---

## 2. Objetivo del Sprint (Sprint Goal)

> *"Incorporar los tres requerimientos nuevos del Product Owner —doble
> aprobación para montos mayores a Q10,000, notificaciones por cambio de estado
> y auditoría de operaciones— sin romper el flujo existente y con evidencia de
> pruebas de cada uno."*

---

## 3. Ítems del Product Backlog Completados

| Historia | Puntos | Estado final | Notas y observaciones |
|---|---:|---|---|
| **SCRUM-54** — R2: Notificar al estudiante en cada cambio de estado | 5 | ☑ Completado | PR #54. El aviso se registra después de guardar el estado, nunca antes. Canal en la aplicación, sin correo |
| **SCRUM-61** — R1: Doble aprobación de solicitudes de más de Q10,000 | 8 | ☑ Completado | PR #56. Nuevo estado *Pendiente de autorización* y rol `autorizador`. Las dos aprobaciones quedan registradas y no se repiten |
| **SCRUM-63** — R3: Auditoría de operaciones relevantes | 8 | ☑ Completado | PR #57. Registro inmutable: la base rechaza UPDATE, DELETE y TRUNCATE. El CUI se guarda enmascarado |
| **Total de puntos completados** | **21** | | |

Trabajo de soporte del Sprint, sin puntos:

| Ítem | PR |
|---|---|
| Análisis de impacto de los requerimientos nuevos | #53, #64 |
| Cuenta de autoridad en los datos de demostración | #58 |
| Anexos y manual técnico con cifras finales | #59 |
| Manual de usuario v1.3 | #61 |
| Despliegue en la nube (Render) | #63 |

### Métricas verificables al cierre del Sprint

| | Antes del Sprint | Al cierre |
|---|---:|---:|
| Endpoints | 29 | 34 |
| Tablas | 5 | 8 |
| Pruebas de backend | 418 | 522 |
| Pruebas de frontend | 97 | 138 |
| Verificaciones de `demo-api.sh` contra PostgreSQL | 48 | 91 |
| Mutantes nuevos atrapados por las pruebas | — | 54 de 54 |

---

## 4. Demostración del Incremento

### Funcionalidad demostrada

- Flujo completo de una solicitud: el estudiante envía, el administrador asigna
  evaluador, el evaluador dictamina.
- Doble aprobación de una solicitud de más de Q10,000, con la autoridad
  autorizadora dando la segunda aprobación.
- Notificaciones al estudiante en cada cambio de estado.
- Consulta de la bitácora de auditoría como administrador.

**Responsable de la demo:** Cristopher Contreras, con apoyo de Brayan Sujuy.
Cada integrante expuso su parte de la presentación.

### Resumen de la demostración

La exposición se desarrolló según lo planificado. En la demostración, el
Product Owner planteó el caso de una solicitud que excede Q10,000. Al
demostrarlo, se omitió el paso en que el administrador asigna la solicitud a un
evaluador, por lo que la solicitud no apareció en la bandeja del evaluador y el
flujo de doble aprobación no se completó frente al Product Owner.

---

## 5. Hallazgo del Sprint

El fallo de la demostración fue de ejecución, no del sistema. Después de la
reunión se repitió el mismo caso (estudiante Carlos Pérez, monto Q18,000) con
todos los pasos: la solicitud pasó a *Pendiente de autorización* tras la
aprobación del evaluador y quedó aprobada con la firma de la autoridad. El
mismo flujo lo verifica automáticamente `scripts/demo-api.sh` (pasos 15b y 15c)
en cada Pull Request.

Causa: no se ensayó la demostración con el orden exacto de pasos.
Acción: ensayar las demostraciones con el orden completo de pasos. El Manual
de Usuario (sección 13) ya indica que el evaluador solo ve las solicitudes que
el administrador le asignó.

---

## 6. Feedback del Product Owner y de los Stakeholders

| Quién | Comentario / Pregunta | Tipo |
|---|---|---|
| Ing. Mario Fuentes (PO) | ¿Qué pasa si la solicitud excede Q10,000? | Pregunta |
| Ing. Mario Fuentes (PO) | Revisará la documentación entregada | Seguimiento |

El Product Owner no hizo más preguntas durante la reunión.

---

## 7. Análisis y Adaptación del Product Backlog

### Nuevos ítems sugeridos

Ninguno durante la reunión. Quedan en el backlog, sin implementar:

- EPIC-04 Comités de Evaluación (CU-17, CU-19).
- EPIC-07 Reportes.
- Envío de notificaciones por correo (hoy solo en la aplicación).

### Repriorización

No hubo cambios de prioridad: era el último Sprint del semestre.

---

## 8. Conclusiones y Próximos Pasos

### Resumen general

Se cumplió el objetivo del Sprint: los tres requerimientos están implementados,
probados y desplegados. La demostración en vivo no mostró el caso de doble
aprobación completo por un error de ejecución, que se corrigió y verificó
después de la reunión.

### Próximas reuniones

| Reunión | Fecha |
|---|---|
| Sprint Retrospective | No programada: último Sprint del semestre |
| Próxima Sprint Planning | No aplica |

### Acuerdos de la reunión

- Entregar la documentación y los anexos para revisión del Product Owner.
- Integrar en `main` los últimos cambios de `develop`.

---

# Plantilla en blanco para los próximos Sprints

Copiar desde aquí para cada nueva Sprint Review.

```markdown
# Minuta — Sprint N

## 1. Información General
| | |
|---|---|
| Nombre del Proyecto | Plataforma Nacional para la Gestión Integral de Becas |
| Número de Sprint | |
| Período del Sprint | |
| Fecha de la Reunión | |

### Asistentes
| Rol | Nombre | Asistió |
|---|---|---|
| Product Owner | Ing. Mario Fuentes | |
| Scrum Master | Ing. Mario Fuentes | |
| Development Team | | |

## 2. Objetivo del Sprint
(Copiar el objetivo definido en la Sprint Planning.)

## 3. Ítems del Product Backlog Completados
| Historia | Estimación | Estado final | Notas |
|---|---|---|---|
| | | ☐ Completado / ☐ No completado | |

### Métricas al cierre
| Métrica | Al inicio | Al cierre |
|---|---:|---:|
| Pruebas en el backend | | |
| Endpoints | | |

## 4. Demostración del Incremento
- Funcionalidad demostrada:
- Responsable de la demo:
- Resumen: ¿fue fluida? ¿errores inesperados? ¿qué generó interés?

## 5. Defectos encontrados en el Sprint
| Defecto | Severidad | Cómo se detectó | Estado |
|---|---|---|---|
| | Crítico / Alto / Medio / Bajo | | |

## 6. Feedback del Product Owner y Stakeholders

## 7. Análisis y Adaptación del Product Backlog
- Nuevos ítems sugeridos:
- Repriorización:
- ¿Cambió algo del contexto que afecte los planes?

## 8. Conclusiones y Próximos Pasos
- Resumen general:
- Sprint Retrospective:
- Próxima Sprint Planning:
- Acuerdos:
```

---

*Documento sujeto a control de versiones en el repositorio del proyecto.*
