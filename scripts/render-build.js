const { execSync } = require("child_process");

console.log("=================================================");
console.log("🚀 EJECUTANDO SCRIPT DE BUILD PARA RENDER - CIN");
console.log("=================================================");

try {
  // 1. Preparar Provider de DB y Generar Prisma Client
  console.log("\n📦 Paso 1: Configurando provider de base de datos y Prisma Client...");
  execSync("node scripts/prepare-db.js", { stdio: "inherit" });

  // 2. Prisma Migrate Deploy y Seed si DATABASE_URL es PostgreSQL
  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  if (isPostgres) {
    console.log("\n🐘 Paso 2: Conexión PostgreSQL detectada. Ejecutando migraciones oficiales (prisma migrate deploy)...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });

    console.log("\n🌱 Paso 3: Ejecutando seed no destructivo e idempotente...");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  } else {
    console.log("\nℹ️ Paso 2: No se detectó DATABASE_URL de PostgreSQL en el entorno de build.");
    console.log("   Si se usa base de datos local SQLite o build offline, las migraciones se ejecutarán al iniciar.");
  }

  // 3. Next.js Build
  console.log("\n⚡ Paso 4: Compilando aplicación Next.js para producción (next build)...");
  execSync("next build", { stdio: "inherit" });

  console.log("\n=================================================");
  console.log("✅ BUILD COMPLETADO EXITOSAMENTE PARA PRODUCCIÓN");
  console.log("=================================================");
} catch (error) {
  console.error("\n❌ ERROR DURANTE EL PROCESO DE BUILD:", error.message);
  process.exit(1);
}
