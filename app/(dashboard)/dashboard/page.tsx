import {
  DollarSign, TrendingUp, UtensilsCrossed, Trophy, Package, AlertTriangle, ShoppingCart,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { VentasDiariasChart, ProductosMasVendidosChart, MetodosPagoChart } from "@/components/dashboard/ventas-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { startOfDay, startOfMonth, subDays, format } from "date-fns";

async function getDashboardData() {
  const admin = createAdminClient();
  const hoy = startOfDay(new Date());
  const inicioMes = startOfMonth(new Date());
  const hace7Dias = startOfDay(subDays(new Date(), 6));

  const [
    ventasHoyRes, ventasMesRes, mesasOcupadasRes, boliranasEnUsoRes,
    ultimasVentasRes, ventasRecientesRes, ventasMesIdsRes, stockBajoRes,
  ] = await Promise.all([
    admin.from("ventas").select("total, metodoPago").eq("estado", "PAGADA").gte("createdAt", hoy.toISOString()),
    admin.from("ventas").select("total").eq("estado", "PAGADA").gte("createdAt", inicioMes.toISOString()),
    admin.from("mesas").select("id", { count: "exact", head: true }).eq("estado", "OCUPADA").is("deletedAt", null),
    admin.from("boliranas").select("id", { count: "exact", head: true }).eq("estado", "EN_USO").is("deletedAt", null),
    admin.from("ventas").select("id, numero, total, metodoPago, mesaId, boliranaId, userId, createdAt").eq("estado", "PAGADA").order("createdAt", { ascending: false }).limit(8),
    admin.from("ventas").select("createdAt, total").eq("estado", "PAGADA").gte("createdAt", hace7Dias.toISOString()),
    admin.from("ventas").select("id").eq("estado", "PAGADA").gte("createdAt", inicioMes.toISOString()),
    admin.from("productos").select("id, nombre, stock, stockMinimo, unidad").eq("activo", true).is("deletedAt", null),
  ]);

  const ventasHoyArr = ventasHoyRes.data ?? [];
  const stockBajo = (stockBajoRes.data ?? []).filter((p) => Number(p.stock) <= Number(p.stockMinimo)).slice(0, 6);

  const ventasDiarias = Array.from({ length: 7 }, (_, i) => {
    const fecha = startOfDay(subDays(new Date(), 6 - i));
    const fechaFin = new Date(fecha);
    fechaFin.setDate(fechaFin.getDate() + 1);
    const dias = (ventasRecientesRes.data ?? []).filter((v) => {
      const d = new Date(v.createdAt);
      return d >= fecha && d < fechaFin;
    });
    return { fecha: format(fecha, "dd/MM"), total: dias.reduce((s, v) => s + Number(v.total), 0), ventas: dias.length };
  });

  const metodosPago = Object.entries(
    ventasHoyArr.reduce((acc: Record<string, number>, v) => {
      acc[v.metodoPago] = (acc[v.metodoPago] ?? 0) + Number(v.total);
      return acc;
    }, {})
  ).map(([metodo, total]) => ({ metodo, total }));

  const ventasMesIds = ventasMesIdsRes.data?.map((v) => v.id) ?? [];
  let productosMasVendidos: { nombre: string; cantidad: number }[] = [];
  if (ventasMesIds.length > 0) {
    const { data: detallesMes } = await admin.from("detalles_venta").select("productoId, cantidad").in("ventaId", ventasMesIds);
    const sums: Record<string, number> = {};
    detallesMes?.forEach((d) => { sums[d.productoId] = (sums[d.productoId] ?? 0) + Number(d.cantidad); });
    const topIds = Object.entries(sums).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id]) => id);
    if (topIds.length > 0) {
      const { data: prods } = await admin.from("productos").select("id, nombre").in("id", topIds);
      productosMasVendidos = topIds.map((id) => ({ nombre: prods?.find((p) => p.id === id)?.nombre ?? "Desconocido", cantidad: sums[id] }));
    }
  }

  const ultimasVentas = ultimasVentasRes.data ?? [];
  const uvMesaIds = [...new Set(ultimasVentas.filter((v) => v.mesaId).map((v) => v.mesaId))] as string[];
  const uvBoliranaIds = [...new Set(ultimasVentas.filter((v) => v.boliranaId).map((v) => v.boliranaId))] as string[];
  const uvUserIds = [...new Set(ultimasVentas.map((v) => v.userId))] as string[];

  const [mesasUV, boliranasUV, usersUV] = await Promise.all([
    uvMesaIds.length > 0 ? admin.from("mesas").select("id, numero, nombre").in("id", uvMesaIds) : { data: [] },
    uvBoliranaIds.length > 0 ? admin.from("boliranas").select("id, numero, nombre").in("id", uvBoliranaIds) : { data: [] },
    uvUserIds.length > 0 ? admin.from("users").select("id, nombre").in("id", uvUserIds) : { data: [] },
  ]);

  const ultimasVentasEnriquecidas = ultimasVentas.map((v) => ({
    ...v,
    mesa: (mesasUV.data as { id: string; numero: number; nombre: string | null }[])?.find((m) => m.id === v.mesaId) ?? null,
    bolirana: (boliranasUV.data as { id: string; numero: number }[])?.find((b) => b.id === v.boliranaId) ?? null,
    usuario: (usersUV.data as { id: string; nombre: string }[])?.find((u) => u.id === v.userId) ?? { nombre: "" },
  }));

  return {
    stats: {
      ventasHoy: ventasHoyArr.reduce((s, v) => s + Number(v.total), 0),
      countVentasHoy: ventasHoyArr.length,
      ventasMes: (ventasMesRes.data ?? []).reduce((s, v) => s + Number(v.total), 0),
      mesasOcupadas: mesasOcupadasRes.count ?? 0,
      boliranasEnUso: boliranasEnUsoRes.count ?? 0,
      stockBajoCount: stockBajo.length,
    },
    ultimasVentas: ultimasVentasEnriquecidas,
    ventasDiarias,
    productosMasVendidos,
    metodosPago,
    stockBajo,
  };
}

const metodoPagoLabel: Record<string, string> = {
  EFECTIVO: "Efectivo", TARJETA: "Tarjeta", NEQUI: "Nequi", DAVIPLATA: "Daviplata", TRANSFERENCIA: "Transferencia",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getDashboardData().catch(() => null);
  const stats = data?.stats ?? { ventasHoy: 0, countVentasHoy: 0, ventasMes: 0, mesasOcupadas: 0, boliranasEnUso: 0, stockBajoCount: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen del estado del bar en tiempo real</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard title="Ventas de hoy" value={formatCurrency(stats.ventasHoy)} description={`${stats.countVentasHoy} transacciones`} icon={DollarSign} variant="success" />
        <StatsCard title="Ventas del mes" value={formatCurrency(stats.ventasMes)} description="Acumulado mensual" icon={TrendingUp} variant="default" />
        <StatsCard title="Mesas ocupadas" value={String(stats.mesasOcupadas)} description="En este momento" icon={UtensilsCrossed} variant={stats.mesasOcupadas > 0 ? "warning" : "default"} />
        <StatsCard title="Boliranas en uso" value={String(stats.boliranasEnUso)} description="Sesiones activas" icon={Trophy} variant={stats.boliranasEnUso > 0 ? "warning" : "default"} />
        <StatsCard title="Stock bajo" value={String(stats.stockBajoCount)} description="Productos por reponer" icon={Package} variant={stats.stockBajoCount > 0 ? "destructive" : "success"} />
        <StatsCard title="Ventas abiertas" value="0" description="Cuentas pendientes" icon={ShoppingCart} variant="default" />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <VentasDiariasChart data={data?.ventasDiarias ?? []} />
        <div className="col-span-3 grid gap-4">
          {data?.metodosPago && data.metodosPago.length > 0 ? (
            <MetodosPagoChart data={data.metodosPago} />
          ) : (
            <Card className="col-span-3">
              <CardHeader><CardTitle>Métodos de pago</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center h-40 text-muted-foreground">Sin datos para hoy</CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <ProductosMasVendidosChart data={data?.productosMasVendidos ?? []} />
        <Card className="col-span-4">
          <CardHeader><CardTitle>Últimas ventas</CardTitle></CardHeader>
          <CardContent>
            {data?.ultimasVentas && data.ultimasVentas.length > 0 ? (
              <div className="space-y-3">
                {data.ultimasVentas.map((venta) => (
                  <div key={venta.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{venta.numero}</span>
                      <span className="text-xs text-muted-foreground">
                        {venta.mesa ? `Mesa ${venta.mesa.numero}` : venta.bolirana ? `Bolirana ${venta.bolirana.numero}` : "Mostrador"}
                        {" • "}{venta.usuario.nombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{metodoPagoLabel[venta.metodoPago] ?? venta.metodoPago}</Badge>
                      <span className="font-semibold text-sm">{formatCurrency(Number(venta.total))}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No hay ventas registradas aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data?.stockBajo && data.stockBajo.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Alertas de inventario bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {data.stockBajo.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <span className="text-sm font-medium">{producto.nombre}</span>
                  <Badge variant="destructive" className="text-xs">{Number(producto.stock).toFixed(0)} {producto.unidad}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
