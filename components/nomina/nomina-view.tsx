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
import { Banknote, Users, Plus, Trash2, Pencil, TrendingDown, CalendarDays } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Empleado {
  id: string;
  nombre: string;
  cargo: string | null;
  jornal: number;
  notas: string | null;
  activo: boolean;
}

interface PagoNomina {
  id: string;
  empleadoId: string;
  monto: number;
  concepto: string | null;
  fecha: string;
  metodoPago: string;
  empleado: { nombre: string; cargo: string | null } | null;
  registrador: { nombre: string } | null;
}

interface NominaViewProps {
  empleados: Empleado[];
  pagos: PagoNomina[];
  totalMes: number;
  mesActual: string;
}

const METODOS = ["EFECTIVO", "TRANSFERENCIA", "NEQUI", "DAVIPLATA", "TARJETA"];

function formatDateLocal(dateStr: string) {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

export function NominaView({ empleados: initialEmpleados, pagos: initialPagos, totalMes: initialTotal, mesActual }: NominaViewProps) {
  const [empleados, setEmpleados] = useState(initialEmpleados);
  const [pagos, setPagos] = useState(initialPagos);
  const [total, setTotal] = useState(initialTotal);
  const [mes, setMes] = useState(mesActual);

  const [showPago, setShowPago] = useState(false);
  const [showEmpleado, setShowEmpleado] = useState(false);
  const [editEmpleado, setEditEmpleado] = useState<Empleado | null>(null);
  const [deletingPagoId, setDeletingPagoId] = useState<string | null>(null);

  const [loadingPago, setLoadingPago] = useState(false);
  const [loadingEmpleado, setLoadingEmpleado] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [formPago, setFormPago] = useState({ empleadoId: "", monto: "", concepto: "", fecha: today, metodoPago: "EFECTIVO" });
  const [formEmpleado, setFormEmpleado] = useState({ nombre: "", cargo: "", jornal: "", notas: "" });

  async function fetchPagos(mesVal?: string) {
    const m = mesVal ?? mes;
    const res = await fetch(`/api/nomina/pagos?mes=${m}`);
    if (res.ok) {
      const data = await res.json();
      setPagos(data.pagos);
      setTotal(data.total);
    }
  }

  async function fetchEmpleados() {
    const res = await fetch("/api/nomina/empleados?includeInactivos=true");
    if (res.ok) setEmpleados(await res.json());
  }

  async function handleMesChange(val: string) {
    setMes(val);
    fetchPagos(val);
  }

  async function handleCreatePago() {
    if (!formPago.empleadoId || !formPago.monto || !formPago.fecha) return;
    setLoadingPago(true);
    const res = await fetch("/api/nomina/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empleadoId: formPago.empleadoId,
        monto: parseFloat(formPago.monto),
        concepto: formPago.concepto || undefined,
        fecha: formPago.fecha,
        metodoPago: formPago.metodoPago,
      }),
    });
    if (res.ok) {
      toast.success("Pago registrado");
      setShowPago(false);
      setFormPago({ empleadoId: "", monto: "", concepto: "", fecha: today, metodoPago: "EFECTIVO" });
      fetchPagos();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al registrar pago");
    }
    setLoadingPago(false);
  }

  async function handleDeletePago(id: string) {
    setDeletingPagoId(id);
    const res = await fetch(`/api/nomina/pagos/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pago eliminado");
      fetchPagos();
    } else toast.error("Error al eliminar pago");
    setDeletingPagoId(null);
  }

  async function handleSaveEmpleado() {
    if (!formEmpleado.nombre.trim()) return;
    setLoadingEmpleado(true);
    const payload = {
      nombre: formEmpleado.nombre.trim(),
      cargo: formEmpleado.cargo.trim() || undefined,
      jornal: formEmpleado.jornal ? parseFloat(formEmpleado.jornal) : 0,
      notas: formEmpleado.notas.trim() || undefined,
    };

    const res = editEmpleado
      ? await fetch(`/api/nomina/empleados/${editEmpleado.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/nomina/empleados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      toast.success(editEmpleado ? "Empleado actualizado" : "Empleado creado");
      setShowEmpleado(false);
      setEditEmpleado(null);
      setFormEmpleado({ nombre: "", cargo: "", jornal: "", notas: "" });
      fetchEmpleados();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar empleado");
    }
    setLoadingEmpleado(false);
  }

  async function handleToggleActivo(empleado: Empleado) {
    const res = await fetch(`/api/nomina/empleados/${empleado.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !empleado.activo }),
    });
    if (res.ok) {
      toast.success(empleado.activo ? "Empleado desactivado" : "Empleado activado");
      fetchEmpleados();
    }
  }

  function openEditEmpleado(emp: Empleado) {
    setEditEmpleado(emp);
    setFormEmpleado({ nombre: emp.nombre, cargo: emp.cargo ?? "", jornal: emp.jornal ? String(emp.jornal) : "", notas: emp.notas ?? "" });
    setShowEmpleado(true);
  }

  function openNewEmpleado() {
    setEditEmpleado(null);
    setFormEmpleado({ nombre: "", cargo: "", jornal: "", notas: "" });
    setShowEmpleado(true);
  }

  function handleEmpleadoSelect(empleadoId: string) {
    const emp = empleados.find((e) => e.id === empleadoId);
    setFormPago({ ...formPago, empleadoId, monto: emp?.jornal ? String(emp.jornal) : formPago.monto });
  }

  const empleadosActivos = empleados.filter((e) => e.activo);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Pagado este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Pagos este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Empleados activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{empleadosActivos.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pagos">
        <TabsList>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="empleados">Empleados</TabsTrigger>
        </TabsList>

        {/* PAGOS TAB */}
        <TabsContent value="pagos" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Mes:</Label>
              <Input
                type="month"
                value={mes}
                onChange={(e) => handleMesChange(e.target.value)}
                className="w-40"
              />
            </div>
            <Button size="sm" onClick={() => setShowPago(true)} disabled={empleadosActivos.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Registrar pago
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.empleado?.nombre ?? "—"}</p>
                        {p.empleado?.cargo && (
                          <p className="text-xs text-muted-foreground">{p.empleado.cargo}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.concepto ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateLocal(p.fecha)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.metodoPago}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.registrador?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {formatCurrency(Number(p.monto))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeletePago(p.id)}
                        disabled={deletingPagoId === p.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pagos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No hay pagos en este mes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {pagos.length > 0 && (
              <div className="flex justify-end px-4 py-3 border-t border-border bg-muted/30">
                <span className="text-sm font-semibold">
                  Total: <span className="text-destructive">{formatCurrency(total)}</span>
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* EMPLEADOS TAB */}
        <TabsContent value="empleados" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewEmpleado}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo empleado
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Jornal base</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.map((emp) => (
                  <TableRow key={emp.id} className={!emp.activo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{emp.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.cargo ?? "—"}</TableCell>
                    <TableCell>{emp.jornal ? formatCurrency(Number(emp.jornal)) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{emp.notas ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={emp.activo
                          ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 cursor-pointer"
                          : "text-muted-foreground cursor-pointer"
                        }
                        onClick={() => handleToggleActivo(emp)}
                      >
                        {emp.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEmpleado(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {empleados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No hay empleados registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Registrar pago */}
      <Dialog open={showPago} onOpenChange={setShowPago}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago de nómina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Empleado *</Label>
              <Select value={formPago.empleadoId} onValueChange={handleEmpleadoSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado..." />
                </SelectTrigger>
                <SelectContent>
                  {empleadosActivos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}{e.cargo ? ` — ${e.cargo}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                value={formPago.monto}
                onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={formPago.fecha}
                onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })}
              />
            </div>
            <div>
              <Label>Concepto (opcional)</Label>
              <Input
                value={formPago.concepto}
                onChange={(e) => setFormPago({ ...formPago, concepto: e.target.value })}
                placeholder="Día de trabajo, hora extra..."
              />
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={formPago.metodoPago} onValueChange={(v) => setFormPago({ ...formPago, metodoPago: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPago(false)}>Cancelar</Button>
            <Button
              onClick={handleCreatePago}
              disabled={loadingPago || !formPago.empleadoId || !formPago.monto || !formPago.fecha}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Crear/editar empleado */}
      <Dialog open={showEmpleado} onOpenChange={(v) => { setShowEmpleado(v); if (!v) setEditEmpleado(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEmpleado ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formEmpleado.nombre}
                onChange={(e) => setFormEmpleado({ ...formEmpleado, nombre: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <Label>Cargo (opcional)</Label>
              <Input
                value={formEmpleado.cargo}
                onChange={(e) => setFormEmpleado({ ...formEmpleado, cargo: e.target.value })}
                placeholder="Mesero, Bartender, Limpieza..."
              />
            </div>
            <div>
              <Label>Jornal base (opcional)</Label>
              <Input
                type="number"
                value={formEmpleado.jornal}
                onChange={(e) => setFormEmpleado({ ...formEmpleado, jornal: e.target.value })}
                placeholder="Monto que se pre-llena al registrar pago"
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={formEmpleado.notas}
                onChange={(e) => setFormEmpleado({ ...formEmpleado, notas: e.target.value })}
                placeholder="Información adicional..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEmpleado(false); setEditEmpleado(null); }}>Cancelar</Button>
            <Button onClick={handleSaveEmpleado} disabled={loadingEmpleado || !formEmpleado.nombre.trim()}>
              {editEmpleado ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
