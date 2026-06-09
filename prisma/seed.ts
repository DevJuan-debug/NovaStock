import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  const categorias = await Promise.all([
    prisma.categoria.upsert({ where: { id: "cat-bebidas" }, update: {}, create: { id: "cat-bebidas", nombre: "Bebidas", color: "#3b82f6", icono: "🍺" } }),
    prisma.categoria.upsert({ where: { id: "cat-cocteleria" }, update: {}, create: { id: "cat-cocteleria", nombre: "Coctelería", color: "#8b5cf6", icono: "🍹" } }),
    prisma.categoria.upsert({ where: { id: "cat-comidas" }, update: {}, create: { id: "cat-comidas", nombre: "Comidas", color: "#f59e0b", icono: "🍔" } }),
    prisma.categoria.upsert({ where: { id: "cat-shots" }, update: {}, create: { id: "cat-shots", nombre: "Shots", color: "#ef4444", icono: "🥃" } }),
    prisma.categoria.upsert({ where: { id: "cat-sin-alcohol" }, update: {}, create: { id: "cat-sin-alcohol", nombre: "Sin Alcohol", color: "#10b981", icono: "🥤" } }),
  ]);

  console.log("✅ Categorías creadas");

  const productos = [
    { nombre: "Cerveza Club Colombia", precio: 5000, costo: 2800, categoriaId: "cat-bebidas", stock: 120, stockMinimo: 24 },
    { nombre: "Cerveza Corona", precio: 7000, costo: 4000, categoriaId: "cat-bebidas", stock: 60, stockMinimo: 12 },
    { nombre: "Aguardiente Néctar", precio: 4000, costo: 2200, categoriaId: "cat-bebidas", stock: 45, stockMinimo: 10 },
    { nombre: "Ron Medellín", precio: 5000, costo: 2800, categoriaId: "cat-bebidas", stock: 30, stockMinimo: 6 },
    { nombre: "Mojito", precio: 18000, costo: 6000, categoriaId: "cat-cocteleria", stock: 50, stockMinimo: 0, unidad: "und" },
    { nombre: "Piña Colada", precio: 18000, costo: 7000, categoriaId: "cat-cocteleria", stock: 50, stockMinimo: 0, unidad: "und" },
    { nombre: "Margarita", precio: 16000, costo: 5500, categoriaId: "cat-cocteleria", stock: 50, stockMinimo: 0, unidad: "und" },
    { nombre: "Sangría", precio: 15000, costo: 5000, categoriaId: "cat-cocteleria", stock: 50, stockMinimo: 0, unidad: "und" },
    { nombre: "Hamburguesa Sencilla", precio: 14000, costo: 6000, categoriaId: "cat-comidas", stock: 30, stockMinimo: 5, unidad: "und" },
    { nombre: "Alitas x 8", precio: 22000, costo: 9000, categoriaId: "cat-comidas", stock: 20, stockMinimo: 5, unidad: "und" },
    { nombre: "Papas Fritas", precio: 8000, costo: 2500, categoriaId: "cat-comidas", stock: 40, stockMinimo: 10, unidad: "und" },
    { nombre: "Nachos con Guacamole", precio: 15000, costo: 5000, categoriaId: "cat-comidas", stock: 25, stockMinimo: 5, unidad: "und" },
    { nombre: "Shot Tequila", precio: 6000, costo: 2000, categoriaId: "cat-shots", stock: 80, stockMinimo: 20, unidad: "und" },
    { nombre: "Shot Vodka", precio: 6000, costo: 2000, categoriaId: "cat-shots", stock: 80, stockMinimo: 20, unidad: "und" },
    { nombre: "Shot Whisky", precio: 8000, costo: 3000, categoriaId: "cat-shots", stock: 60, stockMinimo: 15, unidad: "und" },
    { nombre: "Gaseosa", precio: 3000, costo: 1500, categoriaId: "cat-sin-alcohol", stock: 48, stockMinimo: 12, unidad: "und" },
    { nombre: "Agua Botella", precio: 2000, costo: 800, categoriaId: "cat-sin-alcohol", stock: 60, stockMinimo: 12, unidad: "und" },
    { nombre: "Jugo Natural", precio: 6000, costo: 2500, categoriaId: "cat-sin-alcohol", stock: 20, stockMinimo: 5, unidad: "und" },
  ];

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { id: `prod-${p.nombre.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `prod-${p.nombre.toLowerCase().replace(/\s+/g, "-")}`,
        ...p,
        unidad: p.unidad ?? "und",
      },
    });
  }

  console.log("✅ Productos creados");

  for (let i = 1; i <= 12; i++) {
    await prisma.mesa.upsert({
      where: { numero: i },
      update: {},
      create: {
        numero: i,
        nombre: i <= 4 ? `VIP ${i}` : undefined,
        capacidad: i <= 4 ? 6 : 4,
        zona: i <= 6 ? "Interior" : "Exterior",
      },
    });
  }

  console.log("✅ Mesas creadas (12)");

  for (let i = 1; i <= 6; i++) {
    await prisma.bolirana.upsert({
      where: { numero: i },
      update: {},
      create: { numero: i, precioPorHora: i <= 2 ? 30000 : 20000 },
    });
  }

  console.log("✅ Boliranas creadas (6)");

  await Promise.all([
    prisma.proveedor.upsert({
      where: { id: "prov-1" },
      update: {},
      create: { id: "prov-1", nombre: "Distribuidora Bavaria", contacto: "Carlos López", telefono: "3001234567", email: "ventas@bavaria.com", nit: "890903938-8" },
    }),
    prisma.proveedor.upsert({
      where: { id: "prov-2" },
      update: {},
      create: { id: "prov-2", nombre: "Licores del Valle", contacto: "María García", telefono: "3109876543", email: "info@licoresdelvalle.com" },
    }),
  ]);

  console.log("✅ Proveedores creados");
  console.log("✅ Seed completado. Ahora crea usuarios desde Supabase Auth o usa la sección de Usuarios en el app.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
