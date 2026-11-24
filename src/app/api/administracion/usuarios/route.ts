import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/services/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acceso exclusivo para rol ADMINISTRADOR." }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombreCompleto: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
      orderBy: { creadoEn: "asc" },
    });

    return NextResponse.json({ success: true, usuarios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acceso exclusivo para rol ADMINISTRADOR." }, { status: 403 });
    }

    const { email, nombreCompleto, password, rol } = await req.json();

    if (!email || !nombreCompleto || !password || !rol) {
      return NextResponse.json({ error: "Todos los campos son obligatorios." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email: email.toLowerCase().trim(),
        nombreCompleto,
        passwordHash,
        rol,
        activo: true,
      },
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "CREAR_USUARIO",
      modulo: "ADMINISTRACION",
      detalles: { email: nuevoUsuario.email, rol: nuevoUsuario.rol },
    });

    return NextResponse.json({ success: true, usuario: nuevoUsuario }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acceso exclusivo para rol ADMINISTRADOR." }, { status: 403 });
    }

    const { id, rol, activo, password } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    const updateData: any = {};
    if (rol) updateData.rol = rol;
    if (activo !== undefined) updateData.activo = activo;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, nombreCompleto: true, rol: true, activo: true },
    });

    await registrarAuditoria({
      usuarioId: session.id,
      accion: "ACTUALIZAR_USUARIO",
      modulo: "ADMINISTRACION",
      detalles: { id, updateData: { rol, activo } },
    });

    return NextResponse.json({ success: true, usuario });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
