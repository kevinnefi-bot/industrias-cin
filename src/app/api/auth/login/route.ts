import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import { createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/services/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo electrónico y contraseña requeridos." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: "Credenciales inválidas o usuario inactivo." },
        { status: 401 }
      );
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      return NextResponse.json(
        { error: "Credenciales inválidas o usuario inactivo." },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: usuario.id,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto,
      rol: usuario.rol as any,
    };

    const token = await createSessionToken(sessionPayload);
    const { name, options } = getSessionCookieOptions();

    await registrarAuditoria({
      usuarioId: usuario.id,
      accion: "INICIO_SESION",
      modulo: "AUTENTICACION",
      detalles: { email: usuario.email, rol: usuario.rol },
    });

    const response = NextResponse.json({
      success: true,
      usuario: sessionPayload,
    });

    response.cookies.set(name, token, options);
    return response;
  } catch (error: any) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error en el servidor al autenticar." },
      { status: 500 }
    );
  }
}
