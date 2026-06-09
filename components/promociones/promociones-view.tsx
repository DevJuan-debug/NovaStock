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
import { Plus, Pencil, Trash2, Tag, Moon, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Producto {
  id: string;
  nombre: string;
}

interface Promocion {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: "PORCENTAJE" | "MONTO";
  valor: number;
  productoId: string | null;
  producto: { nombre: string } | null;
  activo: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
}

interface PromocionesViewProps {
  promociones: Promocion[];
  productos: Producto[];
  horaInicioNocturno: string;
}

const emptyForm = {
  nombre: "", descripcion: "", tipo: "PORCENTAJE" as "PORCENTAJE" | "MONTO",
  valor: "", productoId: "todas", activo: true,
  fechaInicio: "", fechaFin: "",
};

export function PromocionesView({ promociones: initial, productos, horaInicioNocturno: initialHora }: PromocionesViewProps) {
  const [promociones, setPromociones] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editPromo, setEditPromo] = useState<Promocion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const [hora, setHora] = useState(initialHora);
  const [savingHora, setSavingHora] = useState(false);

  async function fetchPromociones() {
    const res = await fetch("/api/promociones");
    if (res.ok) setPromociones(await res.json());
  }

  function openNew() {
    setEditPromo(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Promocion) {
    setEditPromo(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      tipo: p.tipo,
      valor: String(p.valor),
      productoId: p.productoId ?? "todas",
      activo: p.activo,
      fechaInicio: p.fechaInicio ?? "",
      fechaFin: p.fechaFin ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.nombre || !form.valor) return;
    setLoading(true);
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      productoId: form.productoId === "todas" ? null : form.productoId,
      activo: form.activo,
      fechaInicio: form.fechaInicio || null,
      fechaFin: form.fechaFin || null,
    };

    const res = editPromo
      ? await fetch(`/api/promociones/${editPromo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/promociones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      toast.success(editPromo ? "Promoción actualizada" : "Promoción creada");
      setShowForm(false);
      setEditPromo(null);
      fetchPromociones();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al guardar");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta promoción?")) return;
    const res = await fetch(`/api/promociones/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Promoción eliminada"); fetchPromociones(); }
    else toast.error("Error al eliminar");
  }

  async function handleToggle(p: Promocion) {
    const res = await fetch(`/api/promociones/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !p.activo }),
    });
    if (res.ok) { fetchPromociones(); }
  }

  async function handleSaveHora() {
    setSavingHora(true);
    const res = await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave: "horaInicioNocturno", valor: hora }),
    });
    if (res.ok) toast.success("Hora nocturna actualizada");
    else toast.error("Error al guardar");
    setSavingHora(false);
  }

  const activas = promociones.filter((p) => p.activo);
  const inactivas = promociones.filter((p) => !p.activo);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-600" /> Promociones activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{activas.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-500/10 border-indigo-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-500" /> Precio nocturno desde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{hora}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" /> Total promociones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{promociones.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="promociones">
        <TabsList>
          <TabsTrigger value="promociones">Promociones</TabsTrigger>
          <TabsTrigger value="nocturno">Precio nocturno</TabsTrigger>
        </TabsList>

        {/* PROMOCIONES TAB */}
        <TabsContent value="promociones" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Nueva promoción
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {promociones.map((p) => (
                  <TableRow key={p.id} className={!p.activo ? "opacity-50" : ""}>
                    <TableCell>
                      <p className="font-medium">{p.nombre}</p>
                      {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
                    </TableCell>
                    <TableCell>
                      {p.productoId
                        ? <Badge variant="outline">{p.producto?.nombre ?? "Producto"}</Badge>
                        : <Badge variant="secondary">Todos los productos</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-emerald-600">
                        {p.tipo === "PORCENTAJE" ? `${p.valor}%` : `-${formatCurrency(p.valor)}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.fechaInicio || p.fechaFin
                        ? `${p.fechaInicio ? formatDate(p.fechaInicio + "T12:00:00") : "∞"} → ${p.fechaFin ? formatDate(p.fechaFin + "T12:00:00") : "∞"}`
                        : "Sin límite"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={p.activo
                          ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 cursor-pointer"
                          : "text-muted-foreground cursor-pointer"
                        }
                        onClick={() => handleToggle(p)}
                      >
                        {p.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {promociones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No hay promociones. Crea una para empezar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* NOCTURNO TAB */}
        <TabsContent value="nocturno" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Moon className="h-5 w-5 text-indigo-500" />
                Configuración de precio nocturno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A partir de esta hora, las mesas o boliranas que se abran usarán el <strong>precio nocturno</strong> de cada producto.
                Los clientes que llegaron antes de esta hora mantienen el precio normal aunque se les atienda después.
              </p>
              <div className="flex items-end gap-3">
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    <Clock className="h-4 w-4" /> Hora de inicio nocturno
                  </Label>
                  <Input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-36"
                  />
                </div>
                <Button onClick={handleSaveHora} disabled={savingHora}>
                  Guardar hora
                </Button>
              </div>
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm space-y-1">
                <p className="font-medium text-indigo-700 dark:text-indigo-400">¿Cómo configurar precios nocturnos?</p>
                <p className="text-muted-foreground">
                  Ve a <strong>Inventario</strong>, edita cada producto y agrega un <strong>Precio nocturno</strong>.
                  Si un producto no tiene precio nocturno configurado, siempre usará el precio normal.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Productos con precio nocturno</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Para ver y editar los precios nocturnos de cada producto, dirígete a <strong>Inventario → editar producto</strong>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal crear/editar */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setEditPromo(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPromo ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="2x1 cervezas, Happy hour..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de descuento</Label>
                <Select value={form.tipo} onValueChange={(v: "PORCENTAJE" | "MONTO") => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                    <SelectItem value="MONTO">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder={form.tipo === "PORCENTAJE" ? "10 = 10%" : "5000"}
                />
              </div>
            </div>
            <div>
              <Label>Aplica a</Label>
              <Select value={form.productoId} onValueChange={(v) => setForm({ ...form, productoId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los productos</SelectItem>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha inicio (opcional)</Label>
                <Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
              </div>
              <div>
                <Label>Fecha fin (opcional)</Label>
                <Input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditPromo(null); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || !form.nombre || !form.valor}>
              {editPromo ? "Guardar cambios" : "Crear promoción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
