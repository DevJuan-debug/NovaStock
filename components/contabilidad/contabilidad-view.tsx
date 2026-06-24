"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Plus, BookOpen } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Movimiento {
  id: string;
  tipo: "INGRESO" | "EGRESO";
  concepto: string;
  monto: number;
  referencia: string | null;
  createdAt: string;
  usuario: { nombre: string };
}

interface CierreCaja {
  id: string;
  totalIngresos: number;
  totalEgresos: number;
  saldoInicial: number;
  saldoFinal: number;
  observaciones: string | null;
  createdAt: string;
  usuario: { nombre: string };
}

interface Resumen {
  ingresosHoy: number;
  egresosHoy: number;
  balanceHoy: number;
  ingresosMes: number;
  egresosMes: number;
  balanceMes: number;
}

interface ContabilidadViewProps {
  movimientosHoy: Movimiento[];
  cierres: CierreCaja[];
  resumen: Resumen;
}

export function ContabilidadView({
  movimientosHoy: initialMov,
  cierres,
  resumen,
}: ContabilidadViewProps) {
  const [movimientos, setMovimientos] = useState(initialMov);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tipo: "EGRESO", concepto: "", monto: "", referencia: "" });

  async function fetchMovimientos() {
    const res = await fetch("/api/contabilidad");
    if (res.ok) {
      const data = await res.json();
      setMovimientos(data.movimientos);
    }
  }

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/contabilidad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: form.tipo,
        concepto: form.concepto,
        monto: parseFloat(form.monto),
        referencia: form.referencia || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Movimiento registrado");
      setShowCreate(false);
      setForm({ tipo: "EGRESO", concepto: "", monto: "", referencia: "" });
      fetchMovimientos();
    } else toast.error("Error al registrar movimiento");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Ingresos hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(resumen.ingresosHoy)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Egresos hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(resumen.egresosHoy)}</p>
          </CardContent>
        </Card>
        <Card className={resumen.balanceHoy >= 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-red-500/10 border-red-500/30"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Balance del día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${resumen.balanceHoy >= 0 ? "text-blue-600" : "text-destructive"}`}>
              {formatCurrency(resumen.balanceHoy)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(resumen.ingresosMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Egresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(resumen.egresosMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${resumen.balanceMes >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatCurrency(resumen.balanceMes)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hoy">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="hoy">Movimientos de hoy</TabsTrigger>
            <TabsTrigger value="cierres">Cierres de caja</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar movimiento
          </Button>
        </div>

        <TabsContent value="hoy">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={m.tipo === "INGRESO"
                          ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                          : "text-destructive border-red-500/30 bg-red-500/10"
                        }
                      >
                        {m.tipo === "INGRESO"
                          ? <TrendingUp className="h-3 w-3 mr-1 inline" />
                          : <TrendingDown className="h-3 w-3 mr-1 inline" />}
                        {m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.concepto}</TableCell>
                    <TableCell className="text-muted-foreground">{m.referencia ?? "-"}</TableCell>
                    <TableCell>{m.usuario?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell className={`text-right font-semibold ${m.tipo === "INGRESO" ? "text-emerald-600" : "text-destructive"}`}>
                      {m.tipo === "EGRESO" ? "-" : "+"}{formatCurrency(Number(m.monto))}
                    </TableCell>
                  </TableRow>
                ))}
                {movimientos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No hay movimientos hoy
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cierres">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Base inicial</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Egresos</TableHead>
                  <TableHead className="text-right">Saldo final</TableHead>
                  <TableHead>Cajero</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cierres.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{formatDateTime(c.createdAt)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(c.saldoInicial))}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(Number(c.totalIngresos))}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(Number(c.totalEgresos))}</TableCell>
                    <TableCell className={`text-right font-bold ${Number(c.saldoFinal) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(Number(c.saldoFinal))}
                    </TableCell>
                    <TableCell>{c.usuario?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.observaciones ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {cierres.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No hay cierres registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: registrar movimiento */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INGRESO">Ingreso</SelectItem>
                  <SelectItem value="EGRESO">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Concepto *</Label>
              <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Descripción del movimiento..." />
            </div>
            <div>
              <Label>Monto *</Label>
              <Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Referencia (opcional)</Label>
              <Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Número de factura, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading || !form.concepto || !form.monto}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
