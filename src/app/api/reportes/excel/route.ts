import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import prisma from "@/lib/db/prisma";
import { obtenerResumenInventario } from "@/lib/services/inventory";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipoReporte = searchParams.get("tipo") || "INVENTARIO_GENERAL";
    const fechaGen = new Date().toISOString().replace("T", " ").substring(0, 19);

    const wb = XLSX.utils.book_new();

    if (tipoReporte === "INVENTARIO_GENERAL" || tipoReporte === "COMPLETO") {
      const stock = await obtenerResumenInventario();
      const rows = stock.map((s) => ({
        "SKU": s.sku,
        "Producto": s.nombre,
        "Línea": s.linea,
        "Sabor": s.sabor,
        "Presentación": s.presentacion,
        "Botellas/Paquete": s.botellasPorPaquete,
        "Stock Actual (Paquetes)": s.stockActualPaquetes,
        "Stock en Botellas": s.stockActualBotellas,
        "Stock en Litros": s.stockActualLitros,
        "Stock Disponible": s.stockDisponiblePaquetes,
        "Stock Comprometido": s.stockComprometidoPaquetes,
        "Stock Mínimo": s.stockMinimoPaquetes,
        "Stock Máximo": s.stockMaximoPaquetes,
        "Precio Paquete (PEN)": s.precioPaquete,
        "Costo Producción (PEN)": s.costoProduccionPaquete,
        "Valorizado Stock (PEN)": Number((s.stockActualPaquetes * s.costoProduccionPaquete).toFixed(2)),
        "Estado Stock": s.estadoStock,
        "Origen de Costo": s.origenCosto,
        "Fecha Reporte": fechaGen,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Inventario y Stock");
    }

    if (tipoReporte === "PEDIDOS_DISTRIBUCION" || tipoReporte === "COMPLETO") {
      const pedidos = await prisma.pedido.findMany({
        include: { vehiculo: true, detalles: true },
        orderBy: { creadoEn: "desc" },
      });

      const rows = pedidos.map((p) => ({
        "Código": p.codigo,
        "Cliente": p.cliente,
        "Zona": p.zonaDestino,
        "Estado": p.estado,
        "Vehículo": p.vehiculo ? p.vehiculo.identificador : "Sin Asignar",
        "Fecha Solicitud": p.fechaSolicitud.toISOString().substring(0, 10),
        "Fecha Prometida": p.fechaPrometidaOriginal.toISOString().substring(0, 16),
        "Fecha Despacho": p.fechaDespachoReal ? p.fechaDespachoReal.toISOString().substring(0, 16) : "-",
        "Fecha Entrega": p.fechaEntregaReal ? p.fechaEntregaReal.toISOString().substring(0, 16) : "-",
        "Retraso Minutos": p.fechaEntregaReal && p.fechaEntregaReal > p.fechaPrometidaOriginal
          ? Math.floor((p.fechaEntregaReal.getTime() - p.fechaPrometidaOriginal.getTime()) / 60000)
          : 0,
        "Total Paquetes": p.detalles.reduce((acc, d) => acc + d.paquetesSolicitados, 0),
        "Origen Datos": "REAL_FUTURO",
        "Fecha Generación": fechaGen,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Pedidos y Despachos");
    }

    if (tipoReporte === "CALIDAD_DANOS" || tipoReporte === "COMPLETO") {
      const danos = await prisma.registroDano.findMany({
        include: { producto: true, vehiculo: true },
        orderBy: { fechaIncidencia: "desc" },
      });

      const rows = danos.map((d) => ({
        "Fecha Incidencia": d.fechaIncidencia.toISOString().substring(0, 10),
        "Producto": d.producto.nombre,
        "Paquetes Dañados": d.cantidadPaquetes,
        "Tipo Daño": d.tipoDano,
        "Etapa Incidencia": d.etapaIncidencia,
        "Zona": d.zonaAfectada || "Planta",
        "Vehículo": d.vehiculo ? d.vehiculo.identificador : "-",
        "Costo Pérdida Estimado (PEN)": d.costoPerdidaEstimado,
        "Motivo / Causa Raíz": d.motivo,
        "Acción Correctiva": d.accionCorrectiva || "-",
        "Origen de Costo": d.origenCosto,
        "Fecha Generación": fechaGen,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Calidad y Daños");
    }

    // Hoja de Metadatos y Origen de Datos
    const metaWs = XLSX.utils.json_to_sheet([
      { "Empresa": "Industrias CIN", "Líneas": "Hervidos y Jugos (Bebidas No Carbonatadas)" },
      { "Empresa": "Fecha Generación", "Líneas": fechaGen },
      { "Empresa": "Periodo", "Líneas": "Operativo Actual (Mes en Curso)" },
      { "Empresa": "Clasificación de Datos", "Líneas": "Estrictamente diferenciado entre RECOPILADO, ESTIMADO y REAL_FUTURO" },
    ]);
    XLSX.utils.book_append_sheet(wb, metaWs, "Metadatos y Origen");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Reporte_CIN_${tipoReporte}_${Date.now()}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
