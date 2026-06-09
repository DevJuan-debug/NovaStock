import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfDay, startOfMonth, subDays, format } from "date-fns";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const hoy = startOfDay(new Date());
  const inicioMes = startOfMonth(new Date());
  const hace7Dias = startOfDay(subDays(new Date(), 6));

  const [
    ventasHoyRes,
    ventasMesRes,
    mesasOcupadasRes,
    boliranasEnUsoRes,
    ultimasVentasRes,
    ventasRecientesRes,
    ventasMesIdsRes,
    stockBajoRes,
  ] = await Promise.all([
    admin.from("ventas").select("total").eq("estado", "PAGADA").gte("createdAt", hoy.toISOString()),
    admin.from("ventas").select("total").eq("estado", "PAGADA").gte("createdAt", inicioMes.toISOString()),
    admin.from("mesas").select("id", { count: "exact", head: true }).eq("estado", "OCUPADA").is("deletedAt", null),
    admin.from("boliranas").select("id", { count: "exact", head: true }).eq("estado", "EN_USO").is("deletedAt", null),
    admin.from("ventas").select("id, numero, total, metodoPago, mesaId, boliranaId, userId, createdAt").eq("estado", "PAGADA").order("createdAt", { ascending: false }).limit(8),
    admin.from("ventas").select("createdAt, total").eq("estado", "PAGADA").gte("createdAt", hace7Dias.toISOString()),
    admin.from("ventas").select("id").eq("estado", "PAGADA").gte("createdAt", inicioMes.toISOString()),
    admin.from("productos").select("id, nombre, stock, stockMinimo, unidad").eq("activo", true).is("deletedAt", null),
  ]);

  const ventasHoyArr = ventasHoyRes.data ?? [];
  const ventasMesArr = ventasMesRes.data ?? [];
  const ventasRecientes = ventasRecientesRes.data ?? [];
  const stockBajoProductos = (stockBajoRes.data ?? []).filter((p) => Number(p.stock) <= Number(p.stockMinimo)).slice(0, 6);

  // 7-day chart
  const ventasDiarias = Array.from({ length: 7 }, (_, i) => {
    const fecha = startOfDay(subDays(new Date(), 6 - i));
    const fechaFin = new Date(fecha);
    fechaFin.setDate(fechaFin.getDate() + 1);
    const dias = ventasRecientes.filter((v) => {
      const d = new Date(v.createdAt);
      return d >= fecha && d < fechaFin;
    });
    return {
      fecha: format(fecha, "dd/MM"),
      total: dias.reduce((s, v) => s + Number(v.total), 0),
      ventas: dias.length,
    };
  });

  // Métodos de pago hoy
  const metodosPago = Object.entries(
    ventasHoyArr.reduce((acc: Record<string, number>, v) => {
      const m = (v as { metodoPago?: string }).metodoPago ?? "EFECTIVO";
      acc[m] = (acc[m] ?? 0) + Number(v.total);
      return acc;
    }, {})
  ).map(([metodo, total]) => ({ metodo, total }));

  // Productos más vendidos del mes
  const ventasMesIds = ventasMesIdsRes.data?.map((v) => v.id) ?? [];
  let productosMasVendidos: { nombre: string; cantidad: number }[] = [];
  if (ventasMesIds.length > 0) {
    const { data: detallesMes } = await admin
      .from("detalles_venta")
      .select("productoId, cantidad")
      .in("ventaId", ventasMesIds);

    const sums: Record<string, number> = {};
    detallesMes?.forEach((d) => {
      sums[d.productoId] = (sums[d.productoId] ?? 0) + Number(d.cantidad);
    });
    const topIds = Object.entries(sums).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id]) => id);
    if (topIds.length > 0) {
      const { data: prods } = await admin.from("productos").select("id, nombre").in("id", topIds);
      productosMasVendidos = topIds.map((id) => ({
        nombre: prods?.find((p) => p.id === id)?.nombre ?? "Desconocido",
        cantidad: sums[id],
      }));
    }
  }

  // Enrich últimas ventas
  const ultimasVentas = ultimasVentasRes.data ?? [];
  const uvMesaIds = [...new Set(ultimasVentas.filter((v) => v.mesaId).map((v) => v.mesaId))] as string[];
  const uvBoliranaIds = [...new Set(ultimasVentas.filter((v) => v.boliranaId).map((v) => v.boliranaId))] as string[];
  const uvUserIds = [...new Set(ultimasVentas.map((v) => v.userId))] as string[];

  const [mesasUV, boliranasUV, usersUV] = await Promise.all([
    uvMesaIds.length > 0 ? admin.from("mesas").select("id, numero, nombre").in("id", uvMesaIds) : { data: [] },
    uvBoliranaIds.length > 0 ? admin.from("boliranas").select("id, numero, nombre").in("id", uvBoliranaIds) : { data: [] },
    admin.from("users").select("id, nombre").in("id", uvUserIds),
  ]);

  const ultimasVentasEnriquecidas = ultimasVentas.map((v) => ({
    ...v,
    mesa: (mesasUV.data as { id: string; numero: number; nombre: string | null }[])?.find((m) => m.id === v.mesaId) ?? null,
    bolirana: (boliranasUV.data as { id: string; numero: number; nombre: string | null }[])?.find((b) => b.id === v.boliranaId) ?? null,
    usuario: (usersUV.data as { id: string; nombre: string }[])?.find((u) => u.id === v.userId) ?? { nombre: "" },
  }));

  return NextResponse.json({
    stats: {
      ventasHoy: ventasHoyArr.reduce((s, v) => s + Number(v.total), 0),
      countVentasHoy: ventasHoyArr.length,
      ventasMes: ventasMesArr.reduce((s, v) => s + Number(v.total), 0),
      mesasOcupadas: mesasOcupadasRes.count ?? 0,
      boliranasEnUso: boliranasEnUsoRes.count ?? 0,
      productosStockBajo: stockBajoProductos.length,
    },
    ultimasVentas: ultimasVentasEnriquecidas,
    ventasDiarias,
    productosMasVendidos,
    metodosPago,
    stockBajoProductos,
  });
}
