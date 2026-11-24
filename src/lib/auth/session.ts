import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserSession, RolUsuario } from "@/types";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "cin-industrias-super-secure-jwt-key-2026-production"
);

const COOKIE_NAME = "cin_session_token";

export async function createSessionToken(payload: UserSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
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
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
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
