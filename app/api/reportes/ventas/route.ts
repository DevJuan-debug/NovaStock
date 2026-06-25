import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo") ?? "hoy";
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let fechaDesde: Date;
  let fechaHasta: Date;

  if (desde && hasta) {
    fechaDesde = new Date(desde);
    fechaHasta = endOfDay(new Date(hasta));
  } else if (periodo === "mes") {
    fechaDesde = startOfMonth(new Date());
    fechaHasta = endOfMonth(new Date());
  } else {
    fechaDesde = startOfDay(new Date());
    fechaHasta = endOfDay(new Date());
  }

  const admin = createAdminClient();

  const nominaStart = fechaDesde.toISOString().split("T")[0];
  const nominaEnd = fechaHasta.toISOString().split("T")[0];

  const [ventasRes, nominaRes, comprasRes] = await Promise.all([
    admin
      .from("ventas")
      .select("*")
      .eq("estado", "PAGADA")
      .gte("createdAt", fechaDesde.toISOString())
      .lte("createdAt", fechaHasta.toISOString())
      .order("createdAt", { ascending: false }),
    admin
      .from("pagos_nomina")
      .select("monto, empleadoId, concepto, fecha")
      .gte("fecha", nominaStart)
      .lte("fecha", nominaEnd),
    admin
      .from("compras")
      .select("id, total, estado, observacion, createdAt, proveedorId")
      .eq("estado", "RECIBIDA")
      .gte("createdAt", fechaDesde.toISOString())
      .lte("createdAt", fechaHasta.toISOString())
      .order("createdAt", { ascending: false }),
  ]);

  const ventas = ventasRes.data ?? [];
  const nominaPagos = nominaRes.data ?? [];
  const comprasData = comprasRes.data ?? [];

  if (ventasRes.error) return NextResponse.json({ error: ventasRes.error.message }, { status: 500 });

  // Enrich compras with proveedor names
  const proveedorIds = [...new Set(comprasData.map((c) => c.proveedorId))] as string[];
  const proveedoresRes = proveedorIds.length > 0
    ? await admin.from("proveedores").select("id, nombre").in("id", proveedorIds)
    : { data: [] };
  const comprasConProveedor = comprasData.map((c) => ({
    ...c,
    proveedor: (proveedoresRes.data as { id: string; nombre: string }[])?.find((p) => p.id === c.proveedorId) ?? null,
  }));

  const ventaIds = ventas.map((v) => v.id);
  const mesaIds = [...new Set(ventas.filter((v) => v.mesaId).map((v) => v.mesaId))] as string[];
  const boliranaIds = [...new Set(ventas.filter((v) => v.boliranaId).map((v) => v.boliranaId))] as string[];
  const userIds = [...new Set(ventas.map((v) => v.userId))] as string[];

  const [mesasRes, boliranasRes, usersRes, detallesRes] = await Promise.all([
    mesaIds.length > 0 ? admin.from("mesas").select("id, numero").in("id", mesaIds) : { data: [] },
    boliranaIds.length > 0 ? admin.from("boliranas").select("id, numero").in("id", boliranaIds) : { data: [] },
    userIds.length > 0 ? admin.from("users").select("id, nombre").in("id", userIds) : { data: [] },
    ventaIds.length > 0
      ? admin.from("detalles_venta").select("*, producto:productos(id, nombre, costo)").in("ventaId", ventaIds)
      : { data: [] },
  ]);

  const detalles = detallesRes.data ?? [];

  const ventasConRelaciones = ventas.map((v) => ({
    ...v,
    mesa: (mesasRes.data as { id: string; numero: number }[])?.find((m) => m.id === v.mesaId) ?? null,
    bolirana: (boliranasRes.data as { id: string; numero: number }[])?.find((b) => b.id === v.boliranaId) ?? null,
    usuario: (usersRes.data as { id: string; nombre: string }[])?.find((u) => u.id === v.userId) ?? null,
    detalles: detalles.filter((d) => d.ventaId === v.id),
  }));

  // Agrupar por producto
  const productoMap: Record<string, { nombre: string; cantidadVendida: number; ingresos: number; costoUnitario: number; costoTotal: number }> = {};
  for (const d of detalles) {
    const pid = d.productoId;
    const prod = d.producto as { id: string; nombre: string; costo: number } | null;
    if (!productoMap[pid]) {
      productoMap[pid] = {
        nombre: prod?.nombre ?? "Producto eliminado",
        cantidadVendida: 0,
        ingresos: 0,
        costoUnitario: Number(prod?.costo ?? 0),
        costoTotal: 0,
      };
    }
    productoMap[pid].cantidadVendida += Number(d.cantidad);
    productoMap[pid].ingresos += Number(d.subtotal);
    productoMap[pid].costoTotal += Number(prod?.costo ?? 0) * Number(d.cantidad);
  }

  const porProducto = Object.entries(productoMap)
    .map(([productoId, p]) => ({
      productoId,
      nombre: p.nombre,
      cantidadVendida: p.cantidadVendida,
      ingresos: p.ingresos,
      costoUnitario: p.costoUnitario,
      costoTotal: p.costoTotal,
      ganancia: p.ingresos - p.costoTotal,
    }))
    .sort((a, b) => b.ingresos - a.ingresos);

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
  const totalTransacciones = ventas.length;
  const totalCostoProductos = porProducto.reduce((s, p) => s + p.costoTotal, 0);
  const totalNomina = nominaPagos.reduce((s, p) => s + Number(p.monto), 0);
  const totalCompras = comprasConProveedor.reduce((s, c) => s + Number(c.total), 0);
  const utilidadBruta = totalVentas - totalCostoProductos;
  const utilidadNeta = utilidadBruta - totalNomina - totalCompras;

  const porMetodo = Object.entries(
    ventas.reduce((acc: Record<string, { total: number; count: number }>, v) => {
      const m = v.metodoPago;
      if (!acc[m]) acc[m] = { total: 0, count: 0 };
      acc[m].total += Number(v.total);
      acc[m].count += 1;
      return acc;
    }, {})
  ).map(([metodo, data]) => ({ metodo, ...data }));

  return NextResponse.json({
    ventas: ventasConRelaciones,
    porProducto,
    nomina: nominaPagos,
    compras: comprasConProveedor,
    porMetodo,
    resumen: {
      totalVentas,
      totalTransacciones,
      promedioPorVenta: totalTransacciones > 0 ? totalVentas / totalTransacciones : 0,
      totalCostoProductos,
      totalNomina,
      totalCompras,
      utilidadBruta,
      utilidadNeta,
    },
    periodo: { desde: fechaDesde, hasta: fechaHasta },
  });
}
