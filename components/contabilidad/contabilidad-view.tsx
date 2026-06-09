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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, Plus, BookOpen, Lock, LockOpen, AlertCircle } from "lucide-react";
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

interface AperturaCaja {
  id: string;
  saldoBase: number;
  createdAt: string;
  usuario: { nombre: string } | null;
}

interface Resumen {
  ingresosHoy: number;
  egresosHoy: number;
  balanceHoy: number;
  ingresosMes: number;
  egresosMes: number;
  balanceMes: number;
}

interface PreviewCierre {
  saldoBase: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoFinal: number;
  periodoDesde: string;
}

interface ContabilidadViewProps {
  movimientosHoy: Movimiento[];
  cierres: CierreCaja[];
  resumen: Resumen;
  apertura: AperturaCaja | null;
}

export function ContabilidadView({
  movimientosHoy: initialMov,
  cierres: initialCierres,
  resumen,
  apertura: initialApertura,
}: ContabilidadViewProps) {
  const [movimientos, setMovimientos] = useState(initialMov);
  const [cierres, setCierres] = useState(initialCierres);
  const [apertura, setApertura] = useState<AperturaCaja | null>(initialApertura);

  const [showCreate, setShowCreate] = useState(false);
  const [showApertura, setShowApertura] = useState(false);
  const [showCierre, setShowCierre] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingApertura, setLoadingApertura] = useState(false);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [form, setForm] = useState({ tipo: "EGRESO", concepto: "", monto: "", referencia: "" });
  const [saldoBase, setSaldoBase] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [preview, setPreview] = useState<PreviewCierre | null>(null);

  async function fetchMovimientos() {
    const res = await fetch("/api/contabilidad");
    if (res.ok) {
      const data = await res.json();
      setMovimientos(data.movimientos);
    }
  }

  async function fetchCierres() {
    const res = await fetch("/api/contabilidad?vista=cierres");
    if (res.ok) {
      const data = await res.json();
      if (data.cierres) setCierres(data.cierres);
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

  async function handleAbrirCaja() {
    if (!saldoBase) return;
    setLoadingApertura(true);
    const res = await fetch("/api/caja/apertura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saldoBase: parseFloat(saldoBase) }),
    });
    if (res.ok) {
      const data = await res.json();
      setApertura(data);
      toast.success("Caja abierta");
      setShowApertura(false);
      setSaldoBase("");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al abrir caja");
    }
    setLoadingApertura(false);
  }

  async function openModalCierre() {
    setShowCierre(true);
    setLoadingPreview(true);
    setPreview(null);
    const res = await fetch("/api/caja/cierre");
    if (res.ok) {
      setPreview(await res.json());
    } else {
      toast.error("Error al calcular cierre");
      setShowCierre(false);
    }
    setLoadingPreview(false);
  }

  async function handleCerrarCaja() {
    setLoadingCierre(true);
    const res = await fetch("/api/caja/cierre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observaciones: observaciones || undefined }),
    });
    if (res.ok) {
      toast.success("Caja cerrada correctamente");
      setApertura(null);
      setShowCierre(false);
      setObservaciones("");
      setPreview(null);
      fetchCierres();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al cerrar caja");
    }
    setLoadingCierre(false);
  }

  return (
    <div className="space-y-6">
      {/* Estado de caja */}
      <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        apertura
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-border bg-muted/40"
      }`}>
        <div className="flex items-center gap-3">
          {apertura ? (
            <LockOpen className="h-5 w-5 text-emerald-600" />
          ) : (
            <Lock className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            {apertura ? (
              <>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Caja abierta — base {formatCurrency(Number(apertura.saldoBase))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Abierta por {apertura.usuario?.nombre ?? "—"} a las {formatDateTime(apertura.createdAt)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-muted-foreground">Caja cerrada</p>
                <p className="text-xs text-muted-foreground">Abre la caja para registrar el turno</p>
              </>
            )}
          </div>
        </div>
        <div>
          {apertura ? (
            <Button size="sm" variant="destructive" onClick={openModalCierre}>
              <Lock className="h-4 w-4 mr-1" /> Cerrar caja
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowApertura(true)}>
              <LockOpen className="h-4 w-4 mr-1" /> Abrir caja
            </Button>
          )}
        </div>
      </div>

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

      {/* Modal: abrir caja */}
      <Dialog open={showApertura} onOpenChange={setShowApertura}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockOpen className="h-5 w-5" /> Abrir caja
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Ingresa el dinero en efectivo con el que inicias el turno.
            </p>
            <div>
              <Label>Saldo base *</Label>
              <Input
                type="number"
                value={saldoBase}
                onChange={(e) => setSaldoBase(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApertura(false)}>Cancelar</Button>
            <Button onClick={handleAbrirCaja} disabled={loadingApertura || !saldoBase}>
              Abrir caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: cerrar caja */}
      <Dialog open={showCierre} onOpenChange={setShowCierre}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Cierre de caja
            </DialogTitle>
          </DialogHeader>

          {loadingPreview ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Calculando cierre...</div>
          ) : preview ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border divide-y divide-border">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">Saldo base</span>
                  <span className="font-medium">{formatCurrency(preview.saldoBase)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> Ingresos del turno
                  </span>
                  <span className="font-medium text-emerald-600">+{formatCurrency(preview.totalIngresos)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-destructive flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" /> Egresos del turno
                  </span>
                  <span className="font-medium text-destructive">-{formatCurrency(preview.totalEgresos)}</span>
                </div>
                <Separator />
                <div className="flex justify-between px-4 py-3 bg-muted/30">
                  <span className="font-semibold">Saldo final en caja</span>
                  <span className={`text-xl font-bold ${preview.saldoFinal >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {formatCurrency(preview.saldoFinal)}
                  </span>
                </div>
              </div>

              {preview.saldoFinal < 0 && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>El saldo final es negativo. Verifica los egresos antes de cerrar.</span>
                </div>
              )}

              <div>
                <Label>Observaciones (opcional)</Label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas del turno, diferencias, incidencias..."
                  rows={3}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCierre(false); setObservaciones(""); setPreview(null); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCerrarCaja}
              disabled={loadingCierre || loadingPreview || !preview}
            >
              Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
