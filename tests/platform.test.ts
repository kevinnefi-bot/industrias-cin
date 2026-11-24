import assert from "assert";
import { solveSimplex } from "../src/lib/math-engine/simplex-solver";
import { solveTransportation } from "../src/lib/math-engine/transportation-solver";
import { solveKnapsack01 } from "../src/lib/math-engine/knapsack-solver";
import { solveCPM } from "../src/lib/math-engine/cpm-network";
import { solveDecisionTheory } from "../src/lib/math-engine/decision-theory";
import { tienePermiso } from "../src/lib/auth/permissions";
import { LPProblem } from "../src/lib/math-engine/types";
import prisma from "../src/lib/db/prisma";
import { registrarMovimientoTransaccional, obtenerStockPorProducto } from "../src/lib/services/inventory";

async function runTestSuite() {
  console.log("==========================================================");
  console.log("EJECUTANDO SUITE DE PRUEBAS AUTOMATIZADAS - INDUSTRIAS CIN");
  console.log("==========================================================");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✓ [PASS] ${name}`);
            passed++;
          })
          .catch((e) => {
            console.error(`  ✗ [FAIL] ${name}:`, e.message);
          });
      } else {
        console.log(`  ✓ [PASS] ${name}`);
        passed++;
      }
    } catch (e: any) {
      console.error(`  ✗ [FAIL] ${name}:`, e.message);
    }
  }

  // 1. TEST PROGRAMACIÓN LINEAL (SIMPLEX)
  test("1.1 Simplex Maximización de Mix: Solución óptima y valor factible", () => {
    // max 3x1 + 5x2 s.a. x1 <= 4, 2x2 <= 12, 3x1 + 2x2 <= 18
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
    // Solución teórica: x1 = 2, x2 = 6 => z = 3(2) + 5(6) = 36
    assert.strictEqual(Math.round(res.valorObjetivo), 36);
    assert.strictEqual(Math.round(res.variablesDecision["x1"]), 2);
    assert.strictEqual(Math.round(res.variablesDecision["x2"]), 6);
  });

  test("1.2 Simplex Sensibilidad: Cambio de parámetro altera variables y objetivo", () => {
    // Al aumentar la capacidad de R2 de 12 a 16:
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
    // El valor objetivo debe aumentar estrictamente
    assert(resMod.valorObjetivo > 36, "El valor objetivo debió aumentar ante mayor disponibilidad de recurso");
  });

  test("1.3 Simplex Detección de Inviabilidad", () => {
    // x1 + x2 <= 2 y x1 + x2 >= 5 (Contradicción matemática)
    const lpInviable: LPProblem = {
      tipo: "MAX",
      c: [1, 1],
      A: [
        [1, 1],
        [1, 1],
      ],
      b: [2, 5],
      operadores: ["<=", ">="],
      nombresVariables: ["x1", "x2"],
      nombresRestricciones: ["R1", "R2"],
    };
    const res = solveSimplex(lpInviable);
    assert.strictEqual(res.esFactible, false);
    assert(res.interpretacion.includes("INVIABLE"), "Debe reportar inviabilidad explícita");
  });

  // 2. TEST TRANSPORTE (VOGEL)
  test("2.1 Transporte Vogel (VAM): Costo mínimo y balanceo de oferta/demanda", () => {
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
    // Demanda 40 = Oferta 40. O1->D1=10 ($20), O1->D2=5 ($15), O2->D2=25 ($25) => Total: $60
    assert.strictEqual(res.valorObjetivo, 60);
  });

  // 3. TEST MOCHILA 0-1 (KNAPSACK)
  test("3.1 Optimización Binaria 0-1: Restricción presupuestaria de mitigación", () => {
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
    // Solución óptima: Item 1 (6, 30) + Item 3 (4, 16) => Costo: 10, Beneficio: 46
    assert.strictEqual(res.valorObjetivo, 46);
    assert.strictEqual(res.variablesDecision["Item 1"], 1);
    assert.strictEqual(res.variablesDecision["Item 3"], 1);
    assert.strictEqual(res.variablesDecision["Item 2"], 0);
  });

  // 4. TEST RUTA CRÍTICA (CPM)
  test("4.1 CPM: Cálculo Forward/Backward Pass, Holguras y Ruta Crítica", () => {
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
    // Ruta A(3) -> B(4) -> D(5) = 12 horas
    assert.strictEqual(res.valorObjetivo, 12);
    assert(res.detallesCalculo.rutaCriticaNombres.includes("Act A"));
    assert(res.detallesCalculo.rutaCriticaNombres.includes("Act B"));
    assert(res.detallesCalculo.rutaCriticaNombres.includes("Act D"));
    assert(!res.detallesCalculo.rutaCriticaNombres.includes("Act C")); // C tiene holgura
  });

  // 5. TEST TEORÍA DE DECISIONES
  test("5.1 Teoría de Decisiones: VME, Maximin (Wald) y Savage", () => {
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
    // VME Alt 1 = 100*0.7 + 20*0.3 = 76
    // VME Alt 2 = 60*0.7 + 50*0.3 = 57
    // VME óptimo = 76 (Alt 1)
    assert.strictEqual(res.valorObjetivo, 76);
    // Maximin: Min(Alt 1) = 20, Min(Alt 2) = 50 => Wald elige Alt 2
    assert.strictEqual(res.detallesCalculo.criterioMaximin.recomendada, "Alt 2");
  });

  // 6. TEST INVENTARIO NEGATIVO (REGLA DE NEGOCIO OBLIGATORIA)
  await test("6.1 Consistencia Contable: Debe bloquear salidas que generen inventario negativo", async () => {
    const prod = await prisma.producto.findFirst();
    const alm = await prisma.almacen.findFirst();
    const user = await prisma.usuario.findFirst();

    if (!prod || !alm || !user) throw new Error("Datos base insuficientes");

    const stockActual = await obtenerStockPorProducto(prod.id);
    let errorCapturado = false;

    try {
      // Intentar egresar más stock del existente
      await registrarMovimientoTransaccional({
        productoId: prod.id,
        almacenId: alm.id,
        tipo: "SALIDA_PEDIDO",
        cantidadPaquetes: stockActual + 9999, // Supera stock
        motivo: "Prueba de stock negativo no permitida",
        usuarioId: user.id,
      });
    } catch (e: any) {
      errorCapturado = true;
      assert(e.message.includes("Stock insuficiente"), "El mensaje de error debe indicar stock insuficiente");
    }

    assert.strictEqual(errorCapturado, true, "El sistema DEBE lanzar excepción e impedir inventario negativo");
  });

  // 7. TEST RBAC (PERMISOS POR ROL)
  test("7.1 RBAC: Validación de acceso y restricciones por rol", () => {
    // Administrador: Todos los permisos
    assert.strictEqual(tienePermiso("ADMINISTRADOR", "ADMINISTRACION"), true);
    assert.strictEqual(tienePermiso("ADMINISTRADOR", "CATALOGO"), true);

    // Gerencia: Sin administración de usuarios
    assert.strictEqual(tienePermiso("GERENCIA", "OPTIMIZACION"), true);
    assert.strictEqual(tienePermiso("GERENCIA", "ADMINISTRACION"), false);

    // Calidad: Solo calidad, reportes y dashboard
    assert.strictEqual(tienePermiso("CALIDAD", "CALIDAD"), true);
    assert.strictEqual(tienePermiso("CALIDAD", "CATALOGO"), false);
    assert.strictEqual(tienePermiso("CALIDAD", "DISTRIBUCION"), false);

    // Distribución: Solo pedidos, flota, optimización y reportes
    assert.strictEqual(tienePermiso("DISTRIBUCION", "DISTRIBUCION"), true);
    assert.strictEqual(tienePermiso("DISTRIBUCION", "INVENTARIO"), false);
  });

  console.log("==========================================================");
  console.log(`RESUMEN: ${passed} de ${total} pruebas pasaron exitosamente.`);
  console.log("==========================================================");
}

runTestSuite().catch((e) => {
  console.error("Error fatal en suite de pruebas:", e);
  process.exit(1);
});
