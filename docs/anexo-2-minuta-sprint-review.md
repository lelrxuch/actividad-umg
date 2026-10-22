# ANEXO 2 — Minuta de Reunión: Revisión de Sprint (Sprint Review)

Este archivo contiene dos cosas:

1. **La minuta del último Sprint**, pre-llenada con lo que se puede verificar en
   el repositorio. Los campos marcados **`‹completar›`** solo los sabe quien
   estuvo en la reunión.
2. **La plantilla en blanco** (sección final) para los Sprints siguientes.

> **Advertencia honesta:** el equipo no ha estado levantando minutas de Sprint
> Review. Esta es la primera. Lo que sigue se reconstruyó a partir del historial
> de Git y de los Pull Requests, que es evidencia verificable, pero **no
> sustituye lo que se dijo en la reunión**: el feedback del Product Owner y las
> decisiones de repriorización hay que llenarlos a mano.

---

# Minuta — Sprint `‹completar: número›`

## 1. Información General

| | |
|---|---|
| **Nombre del Proyecto** | Plataforma Nacional para la Gestión Integral de Becas |
| **Número de Sprint** | `‹completar›` |
| **Período del Sprint** | 15/10/2026 – 21/10/2026 *(inferido de las fechas de merge; confirmar contra Jira)* |
| **Fecha de la Reunión** | `‹completar›` |

### Asistentes

| Rol | Nombre | Asistió |
|---|---|---|
| Product Owner | Ing. Mario Fuentes | `‹confirmar›` |
| Scrum Master | Ing. Mario Fuentes | `‹confirmar›` |
| Development Team | Cristopher Isaí Contreras Salazar | `‹confirmar›` |
| Development Team | Jonatan Santiago | `‹confirmar›` |
| Development Team | José Daniel Pereira Cabrera | `‹confirmar›` |
| Development Team | Brayan David Sujuy Hernández | `‹confirmar›` |
| Development Team | Marco Antonio Rolando Corado García | `‹confirmar›` |
| Stakeholders invitados | `‹completar, si aplica›` | |

---

## 2. Objetivo del Sprint (Sprint Goal)

**`‹completar: copiar el objetivo definido en la Sprint Planning›`**

Objetivo reconstruido a partir de lo entregado, para referencia:

> *"Cerrar el ciclo de vida de una solicitud de beca de extremo a extremo —desde
> la convocatoria que la habilita hasta el dictamen— con control de acceso
> verificado en cada paso."*

---

## 3. Ítems del Product Backlog Completados

| Historia | Estimación | Estado final | Notas y observaciones |
|---|---|---|---|
| **SCRUM-23** — Renombrar `usuario.routes.js` | `‹completar›` | ☑ Completado | PR #23. Deuda de nomenclatura del Sprint anterior |
| **SCRUM-35** — Ciclo de vida de la solicitud | `‹completar›` | ☑ Completado | PR #22. **Se mergeó con un defecto crítico dentro**: ver sección 5 |
| **SCRUM-35 (corrección)** — Autorización de solicitudes | `‹completar›` | ☑ Completado | PR #25. Cierra la elevación de privilegios |
| **SCRUM-42** — Subida de documentos | `‹completar›` | ☑ Completado | PR #24. Lista blanca, límite de 5 MB, nombre generado por el servidor |
| **SCRUM-32 / SCRUM-33** — Convocatorias | `‹completar›` | ☑ Completado | PR #27. Segundo ciclo de vida gobernado por el patrón State |

### Métricas verificables al cierre del Sprint

Las cifras "al inicio" se obtuvieron corriendo la suite sobre el árbol del
repositorio en el commit del 15/10/2026, no de memoria.

| Métrica | Al inicio | Al cierre |
|---|---:|---:|
| Pruebas en el backend | 211 | **314** |
| Archivos de prueba | 14 | **19** |
| Endpoints | 12 | **26** |
| Tablas en la base de datos | 4 | **5** |
| Patrones de diseño implementados | 6 | 6 (el State pasó a gobernar **dos** ciclos de vida) |

---

## 4. Demostración del Incremento

### Funcionalidad demostrada

1. Registro con validación de dominio institucional, y rechazo de un correo no
   institucional enumerando los dominios aceptados.
2. Catálogo de modalidades de beca y los documentos que exige cada una
   (patrón Factory Method).
3. Revisión de expediente incompleto, que informa **exactamente** qué documento
   falta (patrón Builder).
4. Ciclo de vida completo de una solicitud: Borrador → Enviada → En Evaluación →
   Aprobada, y confirmación de que un estado final no admite ninguna acción
   (patrón State).
5. Control de acceso a documentos: el dueño y el evaluador asignado descargan;
   otro estudiante y un evaluador ajeno reciben 403 **sin que el archivo se lea
   del disco** (patrón Proxy).
6. Intento de un estudiante de dictaminar su propia beca, rechazado con 403.

**Responsable de la demo:** `‹completar›`

**Herramienta:** `scripts/demo-api.sh`, recorrido de 15 pasos contra PostgreSQL
real. Cada paso compara el código HTTP obtenido contra el esperado y el script
termina con código de salida distinto de cero si algo falla.

### Resumen de la demostración

`‹completar: ¿fue fluida? ¿surgieron errores inesperados? ¿qué generó más
interés?›`

---

## 5. Hallazgo crítico del Sprint

Se registra aquí porque es el hecho más importante del Sprint y porque cambió el
proceso del equipo.

**Qué pasó.** El Pull Request #22 (SCRUM-35) se revisó, se aprobó y se mergeó
con una **elevación de privilegios** dentro: cualquier usuario con sesión podía
evaluar y dictaminar **cualquier** solicitud indicando su identificador. En la
práctica, un estudiante podía aprobar su propia beca o rechazar la de otro.

**Severidad.** Crítico: acceso indebido con capacidad de alterar resoluciones.

**Cómo se detectó.** En una revisión posterior del módulo, no por una prueba. La
Historia se había entregado **sin pruebas**.

**Cómo se corrigió.** PR #25: se creó una capa de autorización en el dominio que
**falla cerrado** —sin un actor identificable no se autoriza nada— y que se
ejecuta dentro de la aplicación de la transición, de modo que no se puede
agregar una transición nueva sin control de acceso. Se reprodujo el ataque
contra PostgreSQL real antes y después del arreglo.

**Consecuencia secundaria.** La corrección **rompió 10 pruebas existentes**, que
pasaban actores sin derecho a la transición. Esas pruebas se actualizaron. Que
se rompieran es la señal de que la suite de regresión funciona.

**Hallazgo adicional.** Al verificar la corrección se descubrió que el manejo de
errores del controller, que el equipo daba por protegido, **no estaba cubierto
por ninguna prueba**: se revirtió a una versión que filtraba mensajes crudos de
PostgreSQL al cliente y la suite siguió verde. Se escribieron 8 pruebas para
cerrar ese hueco.

**Cambio de proceso adoptado.** Se agregaron dos puntos a la Definición de
Hecho:

- Toda operación que modifique o exponga datos ajenos **declara explícitamente
  quién puede ejecutarla**.
- Existe al menos un **mutante** que demuestra que las pruebas nuevas verifican
  algo.

Y un punto a la lista de revisión de código: *"¿quién puede ejecutar esto?"*.

---

## 6. Feedback del Product Owner y de los Stakeholders

`‹completar: todos los comentarios, preguntas y sugerencias recibidas. Es la
sección que no se puede reconstruir del repositorio.›`

---

## 7. Análisis y Adaptación del Product Backlog

### Nuevos ítems sugeridos

Propuestos por el equipo a partir de lo encontrado en el Sprint. **El Product
Owner decide si entran y con qué prioridad:**

1. **Integración Continua** que ejecute las pruebas en cada push. Hoy nada
   impide mecánicamente que un Pull Request con pruebas rojas llegue a
   `develop`. Es la mejora de mejor relación costo/beneficio del proyecto.
2. **Conectar la validación de identidad al flujo de envío.** El adaptador de
   RENAP está implementado y probado, pero **solo lo importa su prueba**: es
   trabajo hecho que no está rindiendo.
3. **Atender `npm audit`**: 4 vulnerabilidades en el backend, 1 crítica.
4. **Promover `develop` a `main`.** `main` lleva 48 commits de atraso, de modo
   que no representa una versión desplegable.
5. **Pantalla de convocatorias** (SCRUM-35 del backlog): el backend está
   terminado y no hay forma de usarlo desde la aplicación.

### Repriorización

`‹completar›`

Propuesta del equipo para discutir: **priorizar el frontend sobre los módulos de
backend pendientes.** El cliente consume hoy **3 de los 26 endpoints**. Un
módulo de backend más no se puede demostrar en la defensa final; una pantalla
que use lo que ya existe, sí.

### Decisión pendiente del Product Owner

**El punto 7 de la Definición de Hecho no se puede cumplir**: exige despliegue en
un entorno de pruebas y verificación del Product Owner, y **no existe entorno de
Staging**. Ninguna Historia lo ha cumplido nunca. Las dos salidas están en
`docs/anexo-6-plan-de-calidad.md` §4.4 y la decisión le corresponde al Product
Owner.

---

## 8. Conclusiones y Próximos Pasos

### Resumen general

`‹completar: ¿fue un Sprint exitoso? ¿se cumplió el objetivo?›`

Lo verificable: el backend quedó completo para el flujo principal —convocatoria,
solicitud, expediente, dictamen— con 314 pruebas y el recorrido de extremo a
extremo en verde. Lo que no se cumplió: el frontend no avanzó, y el defecto
crítico de SCRUM-35 consumió tiempo que estaba planificado para funcionalidad
nueva.

### Próximas reuniones

| Ceremonia | Fecha y hora |
|---|---|
| Sprint Retrospective | `‹completar›` |
| Próxima Sprint Planning | `‹completar›` |

### Acuerdos de la reunión

`‹completar›`

---
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
