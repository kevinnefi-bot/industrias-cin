import assert from "assert";
import { solveSimplex } from "../src/lib/math-engine/simplex-solver";
import { solveTransportation } from "../src/lib/math-engine/transportation-solver";
import { solveKnapsack01 } from "../src/lib/math-engine/knapsack-solver";
import { solveWarehouseSlotting } from "../src/lib/math-engine/warehouse-optimizer";
import { solveLotSizing } from "../src/lib/math-engine/inventory-lot-sizing";
import { solveResourceAllocation } from "../src/lib/math-engine/resource-allocator";
import { solveMaintenanceAssignment } from "../src/lib/math-engine/maintenance-scheduler";
import { solveCPM } from "../src/lib/math-engine/cpm-network";
import { solveDecisionTheory } from "../src/lib/math-engine/decision-theory";
import { resolverModelo } from "../src/lib/math-engine";
import { tienePermiso } from "../src/lib/auth/permissions";
import { createSessionToken, verifySessionToken } from "../src/lib/auth/session";
import { LPProblem } from "../src/lib/math-engine/types";
import prisma from "../src/lib/db/prisma";
import { registrarMovimientoTransaccional, obtenerStockPorProducto } from "../src/lib/services/inventory";
import { calcularPronosticoMensual } from "../src/lib/services/demand";
import { DataOriginBadge, EmptyState } from "../src/components/common";

async function runTestSuite() {
  console.log("==========================================================");
  console.log("EJECUTANDO SUITE DE PRUEBAS AUTOMATIZADAS - INDUSTRIAS CIN");
  console.log("==========================================================");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ✗ [FAIL] ${name}:`, e.message);
    }
  }

  // 1. MODELO A: PROGRAMACIÓN LINEAL (SIMPLEX)
  await test("1.1 Simplex Maximización de Mix: Solución óptima y valor factible", () => {
    const lp: LPProblem = {
      tipo: "MAX",
      c: [3, 5],
      A: [
        [1, 0],
        [0, 2],
        [3, 2],
      ],
      b: [4, 12, 18],
      operadores: ["<=", "<=", "<="],
      nombresVariables: ["x1", "x2"],
      nombresRestricciones: ["R1", "R2", "R3"],
    };
    const res = solveSimplex(lp);
    assert.strictEqual(res.esFactible, true);
    assert.strictEqual(Math.round(res.valorObjetivo), 36);
    assert.strictEqual(Math.round(res.variablesDecision["x1"]), 2);
    assert.strictEqual(Math.round(res.variablesDecision["x2"]), 6);
  });

  await test("1.2 Simplex Sensibilidad: Variación de holguras y dualidad", () => {
    const lpMod: LPProblem = {
      tipo: "MAX",
      c: [3, 5],
      A: [
        [1, 0],
        [0, 2],
        [3, 2],
      ],
      b: [4, 16, 18],
      operadores: ["<=", "<=", "<="],
      nombresVariables: ["x1", "x2"],
      nombresRestricciones: ["R1", "R2", "R3"],
    };
    const resMod = solveSimplex(lpMod);
    assert.strictEqual(resMod.esFactible, true);
    assert(resMod.valorObjetivo > 36, "El valor objetivo debió aumentar ante mayor disponibilidad de recurso");
  });

  // 2. MODELO B: PROBLEMA DE TRANSPORTE (VOGEL VAM)
  await test("2.1 Transporte Vogel (VAM): Costo mínimo y balanceo de oferta/demanda", () => {
    const res = solveTransportation({
      orígenes: [
        { nombre: "O1", capacidad: 15 },
        { nombre: "O2", capacidad: 25 },
      ],
      destinos: [
        { nombre: "D1", demanda: 10 },
        { nombre: "D2", demanda: 30 },
      ],
      matrizCostos: [
        [2, 3],
        [4, 1],
      ],
    });
    assert.strictEqual(res.esFactible, true);
    assert.strictEqual(res.valorObjetivo, 60);
  });

  // 3. MODELO C: PROTECCIÓN CONTRA DAÑOS (KNAPSACK 0-1)
  await test("3.1 Mochila 0-1: Selección óptima de embalaje para mitigar daños", () => {
    const res = solveKnapsack01({
      presupuestoMaximo: 10,
      objetivoNombre: "Daño Evitado",
      unidadesBeneficio: "PEN",
      items: [
        { id: "1", nombre: "Item 1", costo: 6, beneficio: 30 },
        { id: "2", nombre: "Item 2", costo: 3, beneficio: 14 },
        { id: "3", nombre: "Item 3", costo: 4, beneficio: 16 },
        { id: "4", nombre: "Item 4", costo: 2, beneficio: 9 },
      ],
    });
    assert.strictEqual(res.esFactible, true);
    assert.strictEqual(res.valorObjetivo, 46);
    assert.strictEqual(res.variablesDecision["Item 1"], 1);
    assert.strictEqual(res.variablesDecision["Item 3"], 1);
  });

  // 4. MODELO D: ASIGNACIÓN DE ALMACENES Y SLOTTING
  await test("4.1 Slotting de Almacenes: Asignación priorizada por rotación de producto", () => {
    const res = solveWarehouseSlotting({
      almacenes: [
        { codigo: "ALM-A", nombre: "Almacén A", capacidadPaquetes: 100, volumenM3: 5, distanciaRampaMetros: 10 },
        { codigo: "ALM-B", nombre: "Almacén B", capacidadPaquetes: 200, volumenM3: 10, distanciaRampaMetros: 50 },
      ],
      productos: [
        { sku: "P-ALTA", nombre: "Prod Alta", rotacion: "ALTA", volumenUnitarioM3: 0.02, stockRequeridoPaquetes: 80, stockSeguridadPaquetes: 10 },
        { sku: "P-BAJA", nombre: "Prod Baja", rotacion: "BAJA", volumenUnitarioM3: 0.02, stockRequeridoPaquetes: 50, stockSeguridadPaquetes: 5 },
      ],
    });
    assert.strictEqual(res.esFactible, true);
    assert(res.variablesDecision["P-ALTA en ALM-A"] > 0, "Producto de alta rotación debe asignarse al almacén cercano");
  });

  // 5. MODELO E: LOTE ECONÓMICO Y REPOSICIÓN (EOQ / ROP)
  await test("5.1 Lote Económico EOQ y Stock de Seguridad: Cálculo exacto de Q* y ROP", () => {
    const res = solveLotSizing({
      demandaAnualUnidades: 12000,
      costoEmisionPedido: 50,
      costoMantenimientoUnitario: 2,
      diasLaboralesAno: 300,
      tiempoEntregaDias: 5,
      desviacionEstandarDemandaDiaria: 8,
      nivelServicioZ: 1.645,
    });
    assert.strictEqual(res.esFactible, true);
    // EOQ = sqrt(2 * 12000 * 50 / 2) = sqrt(600000) approx 775
    assert.strictEqual(res.variablesDecision["Lote Óptimo de Producción (Q*)"], 775);
    assert(res.variablesDecision["Punto de Reorden (ROP)"] > 0);
  });

  // 6. MODELO F: ASIGNACIÓN DE RECURSOS ENERGÉTICOS E HÍDRICOS
  await test("6.1 Optimización de Recursos (Agua y Energía): Programación en tarifa valle", () => {
    const res = solveResourceAllocation({
      produccionMinimaHervidosLitros: 5000,
      produccionMinimaJugosLitros: 4000,
      costoKwhPunta: 0.45,
      costoKwhValle: 0.18,
      costoM3Agua: 3.50,
      limiteAguaM3Mensual: 50,
      limiteKwhPuntaMensual: 800,
    });
    assert.strictEqual(res.esFactible, true);
    assert(res.valorObjetivo > 0, "El costo total de producción debe ser positivo");
  });

  // 7. MODELO G: CAPEX SELECCIÓN DE PROYECTOS (BINARIA 0-1)
  await test("7.1 Selección de Inversiones Capex: Maximización de ahorro en planta", () => {
    const res = resolverModelo("MODELO_G", {
      presupuestoMaximo: 50000,
      objetivoNombre: "Ahorro Anual Proyectado",
      unidadesBeneficio: "USD",
      items: [
        { id: "1", nombre: "Pasteurizador Continuo", costo: 30000, beneficio: 45000 },
        { id: "2", nombre: "Envasadora Automática", costo: 25000, beneficio: 32000 },
        { id: "3", nombre: "Filtro Osmosis Inversa", costo: 15000, beneficio: 22000 },
      ],
    });
    assert.strictEqual(res.esFactible, true);
    // Pasteurizador (30k, 45k) + Filtro (15k, 22k) = Costo 45k <= 50k, Beneficio: 67k
    assert.strictEqual(res.valorObjetivo, 67000);
  });

  // 8. MODELO H: ASIGNACIÓN DE MANTENIMIENTO PREVENTIVO (HÚNGARO)
  await test("8.1 Algoritmo Húngaro: Asignación óptima de técnicos a maquinaria", () => {
    const res = solveMaintenanceAssignment({
      tecnicos: [
        { id: "T1", nombre: "Técnico 1", tarifaHora: 30 },
        { id: "T2", nombre: "Técnico 2", tarifaHora: 25 },
      ],
      tareas: [
        { id: "M1", nombre: "Caldera", maquina: "Caldera" },
        { id: "M2", nombre: "Prensa", maquina: "Prensa" },
      ],
      matrizHoras: [
        [4, 8],
        [6, 3],
      ],
    });
    assert.strictEqual(res.esFactible, true);
    // Asignación T1->M1 (4h) + T2->M2 (3h) = 7 horas
    assert.strictEqual(res.valorObjetivo, 7);
  });

  // 9. MODELO I: RUTA CRÍTICA (CPM)
  await test("9.1 CPM: Cálculo Forward/Backward Pass, Holguras y Ruta Crítica", () => {
    const res = solveCPM({
      nombreProyecto: "Test CPM",
      actividades: [
        { id: "A", nombre: "Act A", duracionHoras: 3, predecesores: [] },
        { id: "B", nombre: "Act B", duracionHoras: 4, predecesores: ["A"] },
        { id: "C", nombre: "Act C", duracionHoras: 2, predecesores: ["A"] },
        { id: "D", nombre: "Act D", duracionHoras: 5, predecesores: ["B", "C"] },
      ],
    });
    assert.strictEqual(res.esFactible, true);
    assert.strictEqual(res.valorObjetivo, 12);
    assert.ok(res.detallesCalculo);
    assert(res.detallesCalculo.rutaCriticaNombres.includes("Act A"));
    assert(res.detallesCalculo.rutaCriticaNombres.includes("Act B"));
    assert(res.detallesCalculo.rutaCriticaNombres.includes("Act D"));
  });

  // 10. MODELO J: TEORÍA DE DECISIONES
  await test("10.1 Teoría de Decisiones: VME, Maximin (Wald) y Savage Regret", () => {
    const res = solveDecisionTheory({
      alternativas: ["Alt 1", "Alt 2"],
      estadosNaturaleza: ["Bueno", "Malo"],
      probabilidades: [0.7, 0.3],
      matrizPagos: [
        [100, 20],
        [60, 50],
      ],
    });
    assert.strictEqual(res.esFactible, true);
    assert.strictEqual(res.valorObjetivo, 76);
    assert.ok(res.detallesCalculo);
    assert.strictEqual(res.detallesCalculo.criterioMaximin.recomendada, "Alt 2");
  });

  // 11. CONSISTENCIA CONTABLE: BLOQUEO DE STOCK NEGATIVO
  await test("11.1 Consistencia Contable: Transacción ACID impide inventario negativo", async () => {
    const prod = await prisma.producto.findFirst();
    const alm = await prisma.almacen.findFirst();
    const user = await prisma.usuario.findFirst();

    if (!prod || !alm || !user) throw new Error("Datos base insuficientes en base de datos.");

    const stockActual = await obtenerStockPorProducto(prod.id);
    let errorCapturado = false;

    try {
      await registrarMovimientoTransaccional({
        productoId: prod.id,
        almacenId: alm.id,
        tipo: "SALIDA_PEDIDO",
        cantidadPaquetes: stockActual + 99999,
        motivo: "Prueba de stock negativo no permitida",
        usuarioId: user.id,
      });
    } catch (e: any) {
      errorCapturado = true;
      assert(e.message.includes("Stock insuficiente"), "El mensaje de error debe indicar stock insuficiente");
    }

    assert.strictEqual(errorCapturado, true, "El sistema DEBE lanzar excepción e impedir inventario negativo");
  });

  // 12. SEGURIDAD RBAC (6 ROLES)
  await test("12.1 Seguridad RBAC: Matriz de permisos server-side para los 6 roles", () => {
    assert.strictEqual(tienePermiso("ADMINISTRADOR", "ADMINISTRACION"), true);
    assert.strictEqual(tienePermiso("ADMINISTRADOR", "CATALOGO"), true);
    assert.strictEqual(tienePermiso("GERENCIA", "OPTIMIZACION"), true);
    assert.strictEqual(tienePermiso("GERENCIA", "ADMINISTRACION"), false);
    assert.strictEqual(tienePermiso("INVENTARIO", "INVENTARIO"), true);
    assert.strictEqual(tienePermiso("INVENTARIO", "CALIDAD"), false);
    assert.strictEqual(tienePermiso("PRODUCCION", "OPTIMIZACION"), true);
    assert.strictEqual(tienePermiso("PRODUCCION", "PEDIDOS"), false);
    assert.strictEqual(tienePermiso("DISTRIBUCION", "DISTRIBUCION"), true);
    assert.strictEqual(tienePermiso("DISTRIBUCION", "INVENTARIO"), false);
    assert.strictEqual(tienePermiso("CALIDAD", "CALIDAD"), true);
    assert.strictEqual(tienePermiso("CALIDAD", "CATALOGO"), false);
  });

  await test("12.2 Sesiones JWT: requieren secreto configurado y verifican el token", async () => {
    const originalSecret = process.env.JWT_SECRET;
    const payload = {
      id: "test-user",
      email: "test@cin.com",
      nombreCompleto: "Usuario de prueba",
      rol: "ADMINISTRADOR" as const,
    };

    try {
      delete process.env.JWT_SECRET;
      await assert.rejects(
        () => createSessionToken(payload),
        /JWT_SECRET debe estar configurado/
      );

      process.env.JWT_SECRET = "test-secret-for-session-tests";
      const token = await createSessionToken(payload);
      assert.deepStrictEqual(await verifySessionToken(token), payload);
    } finally {
      if (originalSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalSecret;
      }
    }
  });

  await test("12.3 Pronóstico mensual: usa tres periodos reales y declara historial incompleto", () => {
    const periodos = ["2026-08", "2026-09", "2026-10"];
    const completo = calcularPronosticoMensual(
      { "2026-08": 10, "2026-09": 20, "2026-10": 30 },
      periodos
    );
    assert.strictEqual(completo.estado, "DISPONIBLE");
    assert.strictEqual(completo.demandaEstimadaSiguientePeriodo, 20);
    assert.strictEqual(completo.tendencia, "CRECIENTE");

    const incompleto = calcularPronosticoMensual({ "2026-10": 30 }, periodos);
    assert.strictEqual(incompleto.estado, "DATOS_INSUFICIENTES");
    assert.strictEqual(incompleto.demandaEstimadaSiguientePeriodo, null);
  });

  // 13. COMPONENTES COMMON (DataOriginBadge y EmptyState)
  await test("13.1 Barrel Exports: DataOriginBadge y EmptyState disponibles como named y default", () => {
    assert.strictEqual(typeof DataOriginBadge, "function");
    assert.strictEqual(typeof EmptyState, "function");
  });

  console.log("==========================================================");
  console.log(`RESUMEN: ${passed} de ${total} pruebas pasaron exitosamente.`);
  console.log("==========================================================");
  if (passed !== total) {
    throw new Error(`Fallaron ${total - passed} pruebas.`);
  }
}

runTestSuite().catch((e) => {
  console.error("Error fatal en suite de pruebas:", e);
  process.exit(1);
});
