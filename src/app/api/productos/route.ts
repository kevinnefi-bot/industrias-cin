import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { tienePermiso } from "@/lib/auth/permissions";
import { registrarAuditoria } from "@/lib/services/audit";
import { obtenerResumenInventario } from "@/lib/services/inventory";

const ProductSchema = z.object({
  sku: z.string().min(3).max(64),
  nombre: z.string().min(3).max(255),
  linea: z.enum(["HERVIDOS", "JUGOS"]),
  sabor: z.string().min(2).max(120),
  presentacion: z.string().min(2).max(120),
  volumenLitros: z.number().positive(),
  botellasPorPaquete: z.number().int().positive().default(6),
  precioPaquete: z.number().min(0),
  costoProduccionPaquete: z.number().min(0),
  stockMinimoPaquetes: z.number().int().min(0).default(10),
  stockMaximoPaquetes: z.number().int().min(1).default(500),
  activo: z.boolean().default(true),
  origenCosto: z.enum(["RECOPILADO", "ESTIMADO", "REAL_FUTURO"]).default("RECOPILADO"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (
      !tienePermiso(session.rol, "CATALOGO") &&
      !tienePermiso(session.rol, "PEDIDOS") &&
      !tienePermiso(session.rol, "CALIDAD")
    ) {
      return NextResponse.json({ error: "Permiso denegado para consultar productos." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const busqueda = searchParams.get("busqueda")?.toLowerCase();
    const linea = searchParams.get("linea");
    const presentacion = searchParams.get("presentacion");

    const productosConStock = await obtenerResumenInventario();

    let filtrados = productosConStock;

    if (linea && linea !== "TODAS") {
      filtrados = filtrados.filter((p) => p.linea === linea);
    }

    if (presentacion && presentacion !== "TODAS") {
      filtrados = filtrados.filter((p) => p.presentacion === presentacion);
    }

    if (busqueda) {
      filtrados = filtrados.filter(
        (p) =>
          p.nombre.toLowerCase().includes(busqueda) ||
          p.sku.toLowerCase().includes(busqueda) ||
          p.sabor.toLowerCase().includes(busqueda)
      );
    }

    return NextResponse.json({ success: true, productos: filtrados });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "CATALOGO")) {
      return NextResponse.json({ error: "Permiso denegado para administrar catálogo." }, { status: 403 });
    }

    const json = await req.json();
    const parseResult = ProductSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Datos de producto inválidos.", detalles: parseResult.error.format() }, { status: 400 });
    }

    const data = parseResult.data;

    // Verificar SKU único
    const existeSku = await prisma.producto.findUnique({
      where: { sku: data.sku },
    });
    if (existeSku) {
      return NextResponse.json({ error: `El SKU ${data.sku} ya está registrado.` }, { status: 400 });
    }

    const nuevoProducto = await prisma.producto.create({
      data,
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "CREAR_PRODUCTO",
      modulo: "CATALOGO",
      detalles: { sku: nuevoProducto.sku, nombre: nuevoProducto.nombre, linea: nuevoProducto.linea },
    });

    return NextResponse.json({ success: true, producto: nuevoProducto }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    if (!tienePermiso(session.rol, "CATALOGO")) {
      return NextResponse.json({ error: "Permiso denegado para administrar catálogo." }, { status: 403 });
    }

    const json = await req.json();
    const { id, ...resto } = json;
    if (!id) {
      return NextResponse.json({ error: "ID de producto requerido." }, { status: 400 });
    }

    const productoActualizado = await prisma.producto.update({
      where: { id },
      data: resto,
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "ACTUALIZAR_PRODUCTO",
      modulo: "CATALOGO",
      detalles: { id, cambios: resto },
    });

    return NextResponse.json({ success: true, producto: productoActualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
