import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { obtenerResumenInventario } from "@/lib/services/inventory";

type ReportRow = Record<string, string | number>;

function appendWorksheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: ReportRow[]
) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 4, 16), 40),
  }));
  worksheet.addRows(rows.map((row) => headers.map((header) => row[header] ?? "")));
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "REPORTES")) {
      return NextResponse.json({ error: "Permiso denegado para generar reportes." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tipoReporte = searchParams.get("tipo") || "INVENTARIO_GENERAL";
    const fechaGen = new Date().toISOString().replace("T", " ").substring(0, 19);

    const workbook = new ExcelJS.Workbook();

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
        "Precio Paquete (Bs.)": s.precioPaquete,
        "Costo Producción (Bs.)": s.costoProduccionPaquete,
        "Valorizado Stock (Bs.)": Number((s.stockActualPaquetes * s.costoProduccionPaquete).toFixed(2)),
        "Estado Stock": s.estadoStock,
        "Origen de Costo": s.origenCosto,
        "Fecha Reporte": fechaGen,
      }));
      appendWorksheet(
        workbook,
        "Inventario y Stock",
        [
          "SKU", "Producto", "Línea", "Sabor", "Presentación", "Botellas/Paquete",
          "Stock Actual (Paquetes)", "Stock en Botellas", "Stock en Litros", "Stock Disponible",
          "Stock Comprometido", "Stock Mínimo", "Stock Máximo", "Precio Paquete (Bs.)",
          "Costo Producción (Bs.)", "Valorizado Stock (Bs.)", "Estado Stock", "Origen de Costo",
          "Fecha Reporte",
        ],
        rows
      );
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
      appendWorksheet(
        workbook,
        "Pedidos y Despachos",
        [
          "Código", "Cliente", "Zona", "Estado", "Vehículo", "Fecha Solicitud", "Fecha Prometida",
          "Fecha Despacho", "Fecha Entrega", "Retraso Minutos", "Total Paquetes", "Origen Datos",
          "Fecha Generación",
        ],
        rows
      );
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
        "Costo Pérdida Estimado (Bs.)": d.costoPerdidaEstimado,
        "Motivo / Causa Raíz": d.motivo,
        "Acción Correctiva": d.accionCorrectiva || "-",
        "Origen de Costo": d.origenCosto,
        "Fecha Generación": fechaGen,
      }));
      appendWorksheet(
        workbook,
        "Calidad y Daños",
        [
          "Fecha Incidencia", "Producto", "Paquetes Dañados", "Tipo Daño", "Etapa Incidencia",
          "Zona", "Vehículo", "Costo Pérdida Estimado (Bs.)", "Motivo / Causa Raíz",
          "Acción Correctiva", "Origen de Costo", "Fecha Generación",
        ],
        rows
      );
    }

    // Hoja de Metadatos y Origen de Datos
    appendWorksheet(
      workbook,
      "Metadatos y Origen",
      ["Campo", "Valor"],
      [
        { Campo: "Empresa", Valor: "Industrias CIN" },
        { Campo: "Líneas", Valor: "Hervidos y Jugos (Bebidas No Carbonatadas)" },
        { Campo: "Fecha Generación", Valor: fechaGen },
        { Campo: "Periodo", Valor: "Operativo Actual (Mes en Curso)" },
        { Campo: "Clasificación de Datos", Valor: "RECOPILADO, ESTIMADO y REAL_FUTURO" },
      ]
    );

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer), {
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
