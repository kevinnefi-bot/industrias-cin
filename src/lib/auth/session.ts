import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserSession, RolUsuario } from "@/types";
import prisma from "@/lib/db/prisma";
import { esRolUsuario } from "@/lib/auth/permissions";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET debe estar configurado para firmar y verificar sesiones.");
  }
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = "cin_session_token";

export async function createSessionToken(payload: UserSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  const secret = getSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      nombreCompleto: payload.nombreCompleto as string,
      rol: payload.rol as RolUsuario,
    };
  } catch (err) {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const verifiedSession = await verifySessionToken(token);
  if (!verifiedSession) return null;

  const user = await prisma.usuario.findUnique({
    where: { id: verifiedSession.id },
    select: { id: true, email: true, nombreCompleto: true, rol: true, activo: true },
  });
  if (!user || !user.activo || !esRolUsuario(user.rol)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    nombreCompleto: user.nombreCompleto,
    rol: user.rol,
  };
}

export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 horas
    },
  };
}
