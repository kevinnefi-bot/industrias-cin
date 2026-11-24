# Plataforma Empresarial Industrias CIN
**Sistema Integral de Gestión Operativa y Centro de Optimización Matemática**
**Líneas:** Hervidos y Jugos (Bebidas No Carbonatadas)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/kevinnefi-bot/industrias-cin)

- **Repositorio Oficial en GitHub:** [https://github.com/kevinnefi-bot/industrias-cin](https://github.com/kevinnefi-bot/industrias-cin)
- **URL Oficial de Despliegue en Render:** [https://industrias-cin.onrender.com](https://industrias-cin.onrender.com)

---

## 1. Visión General
Esta plataforma web empresarial ha sido diseñada y construida para **Industrias CIN** con el propósito de centralizar la gestión de producción, kardex contable de stock, administración de almacenes, control de pedidos con SLA estricto, gestión de flota (6 camiones), trazabilidad de calidad/mermas y un **Centro de Optimización Matemática** de 10 modelos de Investigación de Operaciones (IO).

### Principios Críticos de Integridad:
1. **Sin datos simulados ni ficticios:** Las tablas, clasificaciones ABC y pronósticos no inventan datos. Si no hay suficiente historial, se declara explícitamente `DATOS INSUFICIENTES`.
2. **Diferenciación estricta de origen de datos:** Todo dato se clasifica visualmente con badges:
   - `RECOPILADO`: Verificado y oficial de planta/kardex.
   - `ESTIMADO`: Proyecciones o parámetros configurados.
   - `REAL_FUTURO`: Incorporado por usuarios en la operación diaria.
3. **Consistencia contable en Kardex:** El stock físico se deriva de los movimientos de doble partida, bloqueando cualquier salida que genere inventario negativo.
4. **Motor matemático real:** Los 10 modelos de optimización se ejecutan mediante algoritmos analíticos exactos (Simplex, Vogel, Mochila 0-1, Slotting, EOQ/ROP, Asignación Húngara, CPM y Teoría de Decisiones).

---

## 2. Roles y Credenciales de Acceso Rápido
La plataforma cuenta con un sistema RBAC (Role-Based Access Control) con 6 roles configurados. Todos los usuarios tienen la contraseña estándar: `cin123456`.

| Rol | Correo Electrónico | Alcance de Permisos |
|---|---|---|
| **Administrador** | `admin@cin.com` | Control total del sistema, gestión de usuarios y bitácora de auditoría. |
| **Gerencia** | `gerencia@cin.com` | Dashboard ejecutivo, reportes consolidados y escenarios de optimización. |
| **Inventario** | `inventario@cin.com` | Kardex contable, almacenes, catálogo y movimientos de stock. |
| **Producción** | `produccion@cin.com` | Entradas de producción, catálogo y modelos de capacidad/recursos (A, F, I). |
| **Distribución** | `distribucion@cin.com` | Gestión de pedidos, flota de 6 camiones, rutas y optimización de transporte (B, D). |
| **Calidad** | `calidad@cin.com` | Registro de mermas, causas raíz, costos estimados y modelos de mitigación (C). |

> *Nota:* Desde el selector rápido en la barra superior (Navbar) es posible alternar entre cualquiera de los 6 roles con un solo clic para comprobar vistas y permisos.

---

## 3. Arquitectura y Tecnologías
- **Frontend / Full Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Recharts.
- **Base de Datos & ORM:** Prisma ORM con SQLite para ejecución local zero-config (`prisma/dev.db`) y scripts DDL completos con RLS para Supabase (`prisma/supabase_migrations.sql`).
- **Seguridad:** Tokens JWT firmados con `jose` en cookies HTTP-only `SameSite=Lax`, contraseñas hasheadas con `bcryptjs`.
- **Motor Matemático (IO):** Implementación nativa de alta precisión en TypeScript de Simplex Primal de Dos Fases, Vogel VAM, Branch & Bound 0-1, EOQ/ROP estocástico, Algoritmo Húngaro Kuhn-Munkres, Forward/Backward pass CPM y Criterios de Decisión (VME, Wald, Maximax, Hurwicz, Savage).
- **Reportes:** Generación nativa en Microsoft Excel (`xlsx`) y Adobe PDF (`jspdf` + `jspdf-autotable`).

---

## 4. Instalación y Puesta en Marcha

### Prerrequisitos:
- Node.js v18+ instalado.

### Pasos:
1. Clonar el repositorio y acceder al directorio:
   ```bash
   cd amazing-franklin
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Generar cliente Prisma y sincronizar la base de datos:
   ```bash
   npx prisma db push
   ```
4. Poblar datos iniciales autorizados (Catálogo CIN, almacenes, 6 camiones y usuarios):
   ```bash
   npx tsx prisma/seed.ts
   ```
5. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir en el navegador: [http://localhost:3000](http://localhost:3000).

---

## 5. Modelos del Centro de Optimización Matemática

El Centro de Optimización (`/optimizacion`) expone los siguientes 10 modelos ejecutables:

1. **Modelo A (Programación Lineal):** Maximización de margen de contribución sujeto a cuellos de botella en marmitas de hervido, pasteurizador flash y envasadora rotativa.
2. **Modelo B (Problema de Transporte):** Minimización de costos de reparto desde almacenes a zonas Norte, Centro y Sur con balanceo de oferta/demanda (Vogel).
3. **Modelo C (Protección contra Daños 0-1 MIP):** Selección óptima de tecnologías de embalaje y amortiguación para minimizar pérdidas por botellas rotas bajo presupuesto.
4. **Modelo D (Asignación de Almacenes / Slotting):** Asignación multi-criterio de posiciones en almacén según rotación ABC y proximidad a rampa.
5. **Modelo E (Lote Económico EOQ y ROP):** Determinación del tamaño óptimo de lote, punto de reorden y stock de seguridad para un nivel de servicio configurado (ej. 97.5%).
6. **Modelo F (Agua y Electricidad Mensual):** Programación lineal de turnos optimizando consumo de agua y energía eléctrica en horario punta vs valle.
7. **Modelo G (Selección de Inversiones Capex 0-1):** Mochila binaria para portafolio de proyectos de modernización de maquinaria maximizando retorno anual.
8. **Modelo H (Asignación de Mantenimiento):** Algoritmo Húngaro para emparejar especialistas técnicos con maquinaria crítica minimizando horas-persona de paro.
9. **Modelo I (Ruta Crítica CPM):** Grafo de red de producción con Forward/Backward Pass, cálculo de holguras totales/libres y detección de la ruta crítica.
10. **Modelo J (Teoría de Decisiones Estratégicas):** Matriz de pagos evaluada con VME (probabilidades), Wald Maximin (conservador), Maximax, Hurwicz ($\alpha$) y Savage (Minimax Regret).

---

## 6. Ejecución de Pruebas Automatizadas
Para verificar el motor matemático, la prevención de stock negativo y los permisos RBAC, ejecute:
```bash
npx tsx tests/platform.test.ts
```
Todas las pruebas están programadas con aserciones formales sin mocks externos.
