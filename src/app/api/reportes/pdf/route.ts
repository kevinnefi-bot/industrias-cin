import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { obtenerResumenInventario } from "@/lib/services/inventory";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo") || "INVENTARIO";
    const fechaGen = new Date().toLocaleString("es-PE");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Encabezado Corporativo
    doc.setFillColor(22, 101, 52); // Verde CIN corporativo
    doc.rect(0, 0, 210, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("INDUSTRIAS CIN - INFORME EJECUTIVO", 14, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Líneas de Bebidas No Carbonatadas (Hervidos y Jugos) | Sistema Operativo de Gestión", 14, 18);
    doc.text(`Generado: ${fechaGen} | Periodo: Operativo Actual`, 14, 23);

    doc.setTextColor(50, 50, 50);

    if (tipo === "INVENTARIO") {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Reporte Oficial de Inventario y Kardex Físico-Valorizado", 14, 34);

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Origen de datos: RECOPILADO / Kardex Contable Transaccional | Unidades: Paquetes (Pack x6 botellas)", 14, 39);

      const stock = await obtenerResumenInventario();
      const body = stock.map((s) => [
        s.sku,
        s.nombre,
        s.linea,
        s.stockActualPaquetes.toString(),
        s.stockDisponiblePaquetes.toString(),
        s.stockMinimoPaquetes.toString(),
        `S/ ${s.costoProduccionPaquete.toFixed(2)}`,
        `S/ ${(s.stockActualPaquetes * s.costoProduccionPaquete).toFixed(2)}`,
        s.estadoStock,
      ]);

      autoTable(doc, {
        startY: 42,
        head: [["SKU", "Producto", "Línea", "Stock Act.", "Disp.", "Mín.", "Costo", "Valorizado", "Estado"]],
        body,
        theme: "striped",
        headStyles: { fillColor: [22, 101, 52], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });
    } else if (tipo === "PEDIDOS") {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Reporte de Pedidos, Cumplimiento de SLA y Distribución", 14, 34);

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Origen de datos: REAL_FUTURO | Conservación de fecha prometida original para medición de retraso", 14, 39);

      const pedidos = await prisma.pedido.findMany({
        include: { vehiculo: true, detalles: true },
        take: 30,
        orderBy: { creadoEn: "desc" },
      });

      const body = pedidos.map((p) => {
        const retraso = p.fechaEntregaReal && p.fechaEntregaReal > p.fechaPrometidaOriginal
          ? `${Math.floor((p.fechaEntregaReal.getTime() - p.fechaPrometidaOriginal.getTime()) / 60000)} min`
          : "0 min";
        const totalP = p.detalles.reduce((acc, d) => acc + d.paquetesSolicitados, 0);

        return [
          p.codigo,
          p.cliente,
          p.zonaDestino,
          p.estado,
          p.vehiculo ? p.vehiculo.placa : "Sin Asignar",
          p.fechaPrometidaOriginal.toISOString().substring(0, 16).replace("T", " "),
          retraso,
          totalP.toString(),
        ];
      });

      autoTable(doc, {
        startY: 42,
        head: [["Código", "Cliente", "Zona", "Estado", "Vehículo", "Fecha Prometida", "Retraso", "Paquetes"]],
        body,
        theme: "striped",
        headStyles: { fillColor: [22, 101, 52], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });
    } else if (tipo === "CALIDAD") {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Reporte de Calidad, Mermas y Registro de Productos Dañados", 14, 34);

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Origen de datos: ESTIMADO (Costos de pérdida) y RECOPILADO (Incidencias físicas)", 14, 39);

      const danos = await prisma.registroDano.findMany({
        include: { producto: true, vehiculo: true },
        take: 30,
        orderBy: { fechaIncidencia: "desc" },
      });

      const body = danos.map((d) => [
        d.fechaIncidencia.toISOString().substring(0, 10),
        d.producto.nombre,
        d.cantidadPaquetes.toString(),
        d.tipoDano,
        d.etapaIncidencia,
        d.zonaAfectada || "Planta",
        `S/ ${d.costoPerdidaEstimado.toFixed(2)}`,
        d.motivo.substring(0, 35),
      ]);

      autoTable(doc, {
        startY: 42,
        head: [["Fecha", "Producto", "Cant.", "Tipo Daño", "Etapa", "Zona", "Costo Est.", "Causa Raíz"]],
        body,
        theme: "striped",
        headStyles: { fillColor: [22, 101, 52], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
      });
    }

    const pdfOutput = doc.output("arraybuffer");
    return new NextResponse(pdfOutput, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Reporte_CIN_${tipo}_${Date.now()}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
