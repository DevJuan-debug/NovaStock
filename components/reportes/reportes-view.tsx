"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Download, FileSpreadsheet, FileText, BarChart3, TrendingUp, TrendingDown,
  DollarSign, Package, Users, ShoppingBag, Wallet, Truck,
} from "lucide-react";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";

interface VentaReporte {
  id: string;
  numero: string;
  total: number;
  subtotal: number;
  descuento: number;
  propina: number;
  metodoPago: string;
  createdAt: string;
  mesa: { numero: number } | null;
  bolirana: { numero: number } | null;
  usuario: { nombre: string } | null;
  detalles: { cantidad: number; precioUnitario: number; subtotal: number; producto: { nombre: string } }[];
}

interface ProductoReporte {
  productoId: string;
  nombre: string;
  cantidadVendida: number;
  ingresos: number;
  costoUnitario: number;
  costoTotal: number;
  ganancia: number;
}

interface PagoNominaReporte {
  monto: number;
  concepto: string | null;
  fecha: string;
}

interface CompraReporte {
  id: string;
  total: number;
  estado: string;
  observacion: string | null;
  createdAt: string;
  proveedor: { id: string; nombre: string } | null;
}

interface Resumen {
  totalVentas: number;
  totalTransacciones: number;
  promedioPorVenta: number;
  totalCostoProductos: number;
  totalNomina: number;
  totalCompras: number;
  utilidadBruta: number;
  utilidadNeta: number;
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", TARJETA: "Tarjeta", NEQUI: "Nequi",
  DAVIPLATA: "Daviplata", TRANSFERENCIA: "Transferencia",
};

function StatCard({ title, value, icon: Icon, color = "default" }: {
  title: string; value: string; icon: React.ElementType;
  color?: "green" | "red" | "blue" | "default";
}) {
  const colors = {
    green: "text-emerald-600",
    red: "text-destructive",
    blue: "text-blue-600",
    default: "",
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function ReportesView() {
  const [periodo, setPeriodo] = useState("hoy");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ventas, setVentas] = useState<VentaReporte[]>([]);
  const [porProducto, setPorProducto] = useState<ProductoReporte[]>([]);
  const [nomina, setNomina] = useState<PagoNominaReporte[]>([]);
  const [compras, setCompras] = useState<CompraReporte[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [porMetodo, setPorMetodo] = useState<{ metodo: string; total: number; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodoLabel, setPeriodoLabel] = useState("");

  async function fetchReporte() {
    setLoading(true);
    const params = new URLSearchParams({ periodo });
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);

    const res = await fetch(`/api/reportes/ventas?${params}`);
    if (res.ok) {
      const data = await res.json();
      setVentas(data.ventas);
      setPorProducto(data.porProducto);
      setNomina(data.nomina);
      setCompras(data.compras ?? []);
      setResumen(data.resumen);
      setPorMetodo(data.porMetodo);

      if (periodo === "hoy") setPeriodoLabel("Hoy");
      else if (periodo === "mes") setPeriodoLabel("Este mes");
      else setPeriodoLabel(`${desde} al ${hasta}`);
    } else toast.error("Error al cargar reporte");
    setLoading(false);
  }

  async function exportarExcel() {
    if (!resumen) return;
    const { utils, writeFile } = await import("xlsx");
    const wb = utils.book_new();

    // Hoja 1: Resumen financiero
    const wsResumen = utils.json_to_sheet([
      { Concepto: "Ingresos por ventas", Valor: resumen.totalVentas },
      { Concepto: "Costo de productos vendidos", Valor: -resumen.totalCostoProductos },
      { Concepto: "Utilidad bruta", Valor: resumen.utilidadBruta },
      { Concepto: "Gastos de nómina", Valor: -resumen.totalNomina },
      { Concepto: "Pagos a proveedores", Valor: -resumen.totalCompras },
      { Concepto: "UTILIDAD NETA", Valor: resumen.utilidadNeta },
    ]);
    utils.book_append_sheet(wb, wsResumen, "Resumen");

    // Hoja 2: Por producto
    const wsProd = utils.json_to_sheet(
      porProducto.map((p) => ({
        "Producto": p.nombre,
        "Unidades vendidas": p.cantidadVendida,
        "Ingresos": p.ingresos,
        "Costo unitario": p.costoUnitario,
        "Costo total": p.costoTotal,
        "Ganancia bruta": p.ganancia,
        "Margen %": p.ingresos > 0 ? ((p.ganancia / p.ingresos) * 100).toFixed(1) + "%" : "0%",
      }))
    );
    utils.book_append_sheet(wb, wsProd, "Por Producto");

    // Hoja 3: Detalle de ventas
    const wsVentas = utils.json_to_sheet(
      ventas.map((v) => ({
        "Número": v.numero,
        "Fecha": formatDateTime(v.createdAt),
        "Mesa/Bolirana": v.mesa ? `Mesa ${v.mesa.numero}` : v.bolirana ? `Bolirana ${v.bolirana.numero}` : "Mostrador",
        "Atendido por": v.usuario?.nombre ?? "—",
        "Método pago": METODO_LABEL[v.metodoPago] ?? v.metodoPago,
        "Subtotal": Number(v.subtotal),
        "Descuento": Number(v.descuento),
        "Propina": Number(v.propina),
        "Total": Number(v.total),
      }))
    );
    utils.book_append_sheet(wb, wsVentas, "Ventas");

    // Hoja 4: Nómina
    if (nomina.length > 0) {
      const wsNomina = utils.json_to_sheet(
        nomina.map((p) => ({
          "Fecha": p.fecha,
          "Concepto": p.concepto ?? "—",
          "Monto": Number(p.monto),
        }))
      );
      utils.book_append_sheet(wb, wsNomina, "Nómina");
    }

    // Hoja 5: Compras a proveedores
    if (compras.length > 0) {
      const wsCompras = utils.json_to_sheet(
        compras.map((c) => ({
          "Fecha": formatDate(c.createdAt),
          "Proveedor": c.proveedor?.nombre ?? "—",
          "Observación": c.observacion ?? "—",
          "Total": Number(c.total),
        }))
      );
      utils.book_append_sheet(wb, wsCompras, "Compras proveedores");
    }

    writeFile(wb, `reporte-novastock-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel exportado con todas las hojas");
  }

  async function exportarPDF() {
    if (!resumen) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const fechaHoy = new Date().toLocaleDateString("es-CO");

    // Encabezado
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text("NovaStock — Reporte Financiero", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${periodoLabel}   |   Generado: ${fechaHoy}`, 14, 28);

    // Resumen financiero
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text("Resumen Financiero", 14, 40);

    autoTable(doc, {
      startY: 44,
      head: [["Concepto", "Valor"]],
      body: [
        ["Ingresos totales por ventas", formatCurrency(resumen.totalVentas)],
        ["Costo de productos vendidos", `(${formatCurrency(resumen.totalCostoProductos)})`],
        ["Utilidad bruta", formatCurrency(resumen.utilidadBruta)],
        ["Gastos de nómina", `(${formatCurrency(resumen.totalNomina)})`],
        ["UTILIDAD NETA", formatCurrency(resumen.utilidadNeta)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [99, 102, 241] },
      bodyStyles: { textColor: [0, 0, 0] },
      didParseCell: (data) => {
        if (data.row.index === 4) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = resumen.utilidadNeta >= 0 ? [209, 250, 229] : [254, 226, 226];
        }
      },
    });

    // Por producto
    const y1 = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(13);
    doc.text("Detalle por Producto", 14, y1);

    autoTable(doc, {
      startY: y1 + 4,
      head: [["Producto", "Und.", "Ingresos", "Costo total", "Ganancia", "Margen"]],
      body: porProducto.map((p) => [
        p.nombre,
        p.cantidadVendida.toFixed(1),
        formatCurrency(p.ingresos),
        formatCurrency(p.costoTotal),
        formatCurrency(p.ganancia),
        p.ingresos > 0 ? `${((p.ganancia / p.ingresos) * 100).toFixed(1)}%` : "0%",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    // Nómina
    if (nomina.length > 0) {
      const y2 = (doc as any).lastAutoTable.finalY + 12;
      if (y2 > 250) doc.addPage();
      const yNomina = y2 > 250 ? 20 : y2;
      doc.setFontSize(13);
      doc.text(`Nómina del período (${formatCurrency(resumen.totalNomina)})`, 14, yNomina);
      autoTable(doc, {
        startY: yNomina + 4,
        head: [["Fecha", "Concepto", "Monto"]],
        body: nomina.map((p) => [p.fecha, p.concepto ?? "—", formatCurrency(Number(p.monto))]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

    doc.save(`reporte-novastock-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exportado correctamente");
  }

  const hayDatos = resumen !== null;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" /> Filtros del reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Período</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="mes">Este mes</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {periodo === "personalizado" && (
              <>
                <div>
                  <Label>Desde</Label>
                  <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-38" />
                </div>
                <div>
                  <Label>Hasta</Label>
                  <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-38" />
                </div>
              </>
            )}
            <Button onClick={fetchReporte} disabled={loading}>
              {loading ? "Cargando..." : "Generar reporte"}
            </Button>
            {hayDatos && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportarExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                </Button>
                <Button variant="outline" onClick={exportarPDF}>
                  <FileText className="h-4 w-4 mr-2" /> PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hayDatos && resumen && (
        <>
          {/* Stats financieros */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Ingresos por ventas" value={formatCurrency(resumen.totalVentas)} icon={TrendingUp} color="green" />
            <StatCard title="Costo de productos" value={formatCurrency(resumen.totalCostoProductos)} icon={Package} color="red" />
            <StatCard title="Nómina del período" value={formatCurrency(resumen.totalNomina)} icon={Users} color="red" />
            <StatCard title="Pagos a proveedores" value={formatCurrency(resumen.totalCompras)} icon={Truck} color="red" />
          </div>

          {/* Utilidad neta destacada */}
          <div className={`rounded-xl border-2 px-6 py-4 flex items-center justify-between ${
            resumen.utilidadNeta >= 0
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-red-500/40 bg-red-500/5"
          }`}>
            <div>
              <p className="text-sm text-muted-foreground font-medium">UTILIDAD NETA</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ventas − Costo de productos − Nómina − Compras · {resumen.totalTransacciones} ventas · Prom. {formatCurrency(resumen.promedioPorVenta)}
              </p>
            </div>
            <p className={`text-4xl font-bold tabular-nums ${resumen.utilidadNeta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatCurrency(resumen.utilidadNeta)}
            </p>
          </div>

          <Tabs defaultValue="productos">
            <TabsList>
              <TabsTrigger value="productos">Por producto</TabsTrigger>
              <TabsTrigger value="ventas">Detalle ventas</TabsTrigger>
              <TabsTrigger value="nomina">Nómina</TabsTrigger>
              <TabsTrigger value="proveedores">Pagos proveedor</TabsTrigger>
              <TabsTrigger value="metodos">Métodos de pago</TabsTrigger>
            </TabsList>

            {/* POR PRODUCTO */}
            <TabsContent value="productos" className="space-y-2">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Und. vendidas</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Costo total</TableHead>
                      <TableHead className="text-right">Ganancia bruta</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porProducto.map((p) => {
                      const margen = p.ingresos > 0 ? (p.ganancia / p.ingresos) * 100 : 0;
                      return (
                        <TableRow key={p.productoId}>
                          <TableCell className="font-medium">{p.nombre}</TableCell>
                          <TableCell className="text-right tabular-nums">{p.cantidadVendida.toFixed(1)}</TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-600 font-medium">
                            {formatCurrency(p.ingresos)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatCurrency(p.costoTotal)}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums font-semibold ${p.ganancia >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {formatCurrency(p.ganancia)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={margen >= 40 ? "text-emerald-600 border-emerald-500/30" : margen >= 20 ? "text-amber-600 border-amber-500/30" : "text-destructive border-red-500/30"}
                            >
                              {margen.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {porProducto.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No hay ventas en el período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {porProducto.length > 0 && (
                  <div className="grid grid-cols-3 border-t border-border">
                    <div className="px-4 py-3 text-sm font-semibold text-right col-start-3 flex justify-between">
                      <span className="text-muted-foreground">Total ingresos</span>
                      <span className="text-emerald-600">{formatCurrency(resumen.totalVentas)}</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* DETALLE VENTAS */}
            <TabsContent value="ventas">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha / Hora</TableHead>
                      <TableHead>Mesa / Bolirana</TableHead>
                      <TableHead>Atendido por</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventas.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm">{v.numero}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(v.createdAt)}</TableCell>
                        <TableCell>
                          {v.mesa ? (
                            <Badge variant="outline">Mesa {v.mesa.numero}</Badge>
                          ) : v.bolirana ? (
                            <Badge variant="outline">Bolirana {v.bolirana.numero}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Mostrador</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{v.usuario?.nombre ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{METODO_LABEL[v.metodoPago] ?? v.metodoPago}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(Number(v.total))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {ventas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No hay ventas en el período seleccionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* NÓMINA */}
            <TabsContent value="nomina" className="space-y-2">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nomina.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{p.fecha}</TableCell>
                        <TableCell className="text-muted-foreground">{p.concepto ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-destructive font-medium">
                          {formatCurrency(Number(p.monto))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {nomina.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                          No hay pagos de nómina en este período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {nomina.length > 0 && (
                  <div className="flex justify-between items-center px-4 py-3 border-t border-border bg-muted/30">
                    <span className="text-sm text-muted-foreground">{nomina.length} pagos</span>
                    <span className="text-sm font-semibold text-destructive">
                      Total: {formatCurrency(resumen.totalNomina)}
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PAGOS A PROVEEDOR */}
            <TabsContent value="proveedores" className="space-y-2">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Observación</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{formatDate(c.createdAt)}</TableCell>
                        <TableCell className="font-medium">{c.proveedor?.nombre ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{c.observacion ?? "—"}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-destructive">
                          {formatCurrency(Number(c.total))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {compras.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          No hay compras a proveedores en este período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {compras.length > 0 && (
                  <div className="flex justify-between items-center px-4 py-3 border-t border-border bg-muted/30">
                    <span className="text-sm text-muted-foreground">{compras.length} compra(s)</span>
                    <span className="text-sm font-semibold text-destructive">
                      Total: {formatCurrency(resumen.totalCompras)}
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* MÉTODOS DE PAGO */}
            <TabsContent value="metodos">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {porMetodo.map((m) => (
                  <Card key={m.metodo}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        {METODO_LABEL[m.metodo] ?? m.metodo}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tabular-nums">{formatCurrency(m.total)}</p>
                      <p className="text-sm text-muted-foreground">{m.count} transacciones</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {resumen.totalVentas > 0 ? `${((m.total / resumen.totalVentas) * 100).toFixed(1)}% del total` : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {porMetodo.length === 0 && (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No hay datos de métodos de pago
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!hayDatos && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">Selecciona un período y genera el reporte</p>
          <p className="text-sm mt-1">Verás el desglose por producto, nómina, costos y utilidad neta</p>
        </div>
      )}
    </div>
  );
}
