"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Truck, ShoppingCart, Trash2, X, Edit } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  nit: string | null;
  activo: boolean;
}

interface CompraDetalle {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto: { id: string; nombre: string } | null;
}

interface Compra {
  id: string;
  proveedorId: string;
  proveedor: { id: string; nombre: string } | null;
  total: number;
  estado: "PENDIENTE" | "RECIBIDA" | "CANCELADA";
  observacion: string | null;
  createdAt: string;
  detalles: CompraDetalle[];
}

interface Producto {
  id: string;
  nombre: string;
  activo: boolean;
  unidad: string;
}

type CompraItem = { productoId: string; cantidad: string; precioUnitario: string };

const emptyProvForm = { nombre: "", contacto: "", telefono: "", email: "", direccion: "", nit: "" };

export function ProveedoresView({
  proveedores: initial,
  compras: initialCompras,
  productos,
}: {
  proveedores: Proveedor[];
  compras: Compra[];
  productos: Producto[];
}) {
  const [proveedores, setProveedores] = useState(initial);
  const [compras, setCompras] = useState(initialCompras);
  const [loading, setLoading] = useState(false);

  // Proveedor form
  const [showProvForm, setShowProvForm] = useState(false);
  const [editProv, setEditProv] = useState<Proveedor | null>(null);
  const [provForm, setProvForm] = useState(emptyProvForm);

  // Compra form
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [compraForm, setCompraForm] = useState({ proveedorId: "", estado: "RECIBIDA", observacion: "" });
  const [compraItems, setCompraItems] = useState<CompraItem[]>([{ productoId: "", cantidad: "", precioUnitario: "" }]);

  // Compra detail view
  const [showDetalle, setShowDetalle] = useState<Compra | null>(null);

  async function fetchProveedores() {
    const res = await fetch("/api/proveedores");
    if (res.ok) setProveedores(await res.json());
  }

  async function fetchCompras() {
    const res = await fetch("/api/compras");
    if (res.ok) setCompras(await res.json());
  }

  async function handleGuardarProveedor() {
    setLoading(true);
    const body = {
      nombre: provForm.nombre,
      contacto: provForm.contacto || undefined,
      telefono: provForm.telefono || undefined,
      email: provForm.email || undefined,
      direccion: provForm.direccion || undefined,
      nit: provForm.nit || undefined,
    };
    const url = editProv ? `/api/proveedores/${editProv.id}` : "/api/proveedores";
    const method = editProv ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success(editProv ? "Proveedor actualizado" : "Proveedor creado");
      setShowProvForm(false);
      setEditProv(null);
      setProvForm(emptyProvForm);
      fetchProveedores();
    } else toast.error("Error al guardar proveedor");
    setLoading(false);
  }

  async function handleEliminarProveedor(id: string) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    const res = await fetch(`/api/proveedores/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Proveedor eliminado"); fetchProveedores(); }
    else toast.error("Error al eliminar proveedor");
  }

  async function handleCrearCompra() {
    const itemsValidos = compraItems.filter((i) => i.productoId && i.cantidad && i.precioUnitario);
    if (!compraForm.proveedorId || itemsValidos.length === 0) return;
    setLoading(true);
    const res = await fetch("/api/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proveedorId: compraForm.proveedorId,
        estado: compraForm.estado,
        observacion: compraForm.observacion || undefined,
        detalles: itemsValidos.map((i) => ({
          productoId: i.productoId,
          cantidad: parseFloat(i.cantidad),
          precioUnitario: parseFloat(i.precioUnitario),
        })),
      }),
    });
    if (res.ok) {
      toast.success(
        compraForm.estado === "RECIBIDA"
          ? "Compra registrada y stock actualizado"
          : "Compra registrada como pendiente"
      );
      setShowCompraForm(false);
      setCompraForm({ proveedorId: "", estado: "RECIBIDA", observacion: "" });
      setCompraItems([{ productoId: "", cantidad: "", precioUnitario: "" }]);
      fetchCompras();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Error al registrar compra");
    }
    setLoading(false);
  }

  const totalCompras = compras.reduce((s, c) => s + Number(c.total), 0);
  const comprasRecibidas = compras.filter((c) => c.estado === "RECIBIDA").length;
  const comprasPendientes = compras.filter((c) => c.estado === "PENDIENTE").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proveedores</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{proveedores.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total compras</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{compras.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recibidas</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{comprasRecibidas}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total pagado</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(totalCompras)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compras">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="compras">
              Compras
              {comprasPendientes > 0 && (
                <Badge variant="outline" className="ml-1 h-4 text-xs px-1">{comprasPendientes} pend.</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditProv(null); setProvForm(emptyProvForm); setShowProvForm(true); }}>
              <Truck className="h-4 w-4 mr-1" /> Nuevo Proveedor
            </Button>
            <Button size="sm" onClick={() => setShowCompraForm(true)} disabled={proveedores.length === 0}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Registrar Compra
            </Button>
          </div>
        </div>

        {/* COMPRAS */}
        <TabsContent value="compras" className="space-y-4">
          {proveedores.length === 0 && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-700">
              Primero crea al menos un proveedor para poder registrar compras.
            </div>
          )}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Observación</TableHead>
                  <TableHead className="text-center">Productos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compras.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setShowDetalle(c)}
                  >
                    <TableCell className="text-sm">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="font-medium">{c.proveedor?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.observacion ?? "—"}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">{c.detalles.length}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(Number(c.total))}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.estado === "RECIBIDA" ? "default" : c.estado === "PENDIENTE" ? "outline" : "secondary"}>
                        {c.estado === "RECIBIDA" ? "Recibida" : c.estado === "PENDIENTE" ? "Pendiente" : "Cancelada"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {compras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      No hay compras registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* PROVEEDORES */}
        <TabsContent value="proveedores" className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((p) => (
                  <TableRow key={p.id} className={!p.activo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.contacto ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.telefono ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.nit ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditProv(p); setProvForm({ nombre: p.nombre, contacto: p.contacto ?? "", telefono: p.telefono ?? "", email: p.email ?? "", direccion: p.direccion ?? "", nit: p.nit ?? "" }); setShowProvForm(true); }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => handleEliminarProveedor(p.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {proveedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      No hay proveedores registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Proveedor */}
      <Dialog open={showProvForm} onOpenChange={(o) => { setShowProvForm(o); if (!o) { setEditProv(null); setProvForm(emptyProvForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editProv ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input value={provForm.nombre} onChange={(e) => setProvForm({ ...provForm, nombre: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contacto</Label>
                <Input value={provForm.contacto} onChange={(e) => setProvForm({ ...provForm, contacto: e.target.value })} placeholder="Persona de contacto" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={provForm.telefono} onChange={(e) => setProvForm({ ...provForm, telefono: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={provForm.email} onChange={(e) => setProvForm({ ...provForm, email: e.target.value })} />
              </div>
              <div>
                <Label>NIT</Label>
                <Input value={provForm.nit} onChange={(e) => setProvForm({ ...provForm, nit: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={provForm.direccion} onChange={(e) => setProvForm({ ...provForm, direccion: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowProvForm(false); setEditProv(null); setProvForm(emptyProvForm); }}>Cancelar</Button>
            <Button onClick={handleGuardarProveedor} disabled={loading || !provForm.nombre}>
              {editProv ? "Guardar cambios" : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva Compra */}
      <Dialog open={showCompraForm} onOpenChange={setShowCompraForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Registrar Compra</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proveedor *</Label>
                <Select value={compraForm.proveedorId} onValueChange={(v) => setCompraForm({ ...compraForm, proveedorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={compraForm.estado} onValueChange={(v) => setCompraForm({ ...compraForm, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECIBIDA">Recibida (actualiza stock)</SelectItem>
                    <SelectItem value="PENDIENTE">Pendiente (solo registra)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Productos *</Label>
                <Button
                  variant="outline" size="sm" type="button"
                  onClick={() => setCompraItems([...compraItems, { productoId: "", cantidad: "", precioUnitario: "" }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Agregar producto
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_90px_110px_32px] gap-2 text-xs text-muted-foreground px-1">
                  <span>Producto</span><span>Cantidad</span><span>Precio unit.</span><span />
                </div>
                {compraItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_110px_32px] gap-2 items-center">
                    <Select value={item.productoId} onValueChange={(v) => {
                      const u = [...compraItems]; u[i] = { ...u[i], productoId: v }; setCompraItems(u);
                    }}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Producto..." /></SelectTrigger>
                      <SelectContent>
                        {productos.filter((p) => p.activo).map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" placeholder="0" className="h-8 text-sm"
                      value={item.cantidad}
                      onChange={(e) => { const u = [...compraItems]; u[i] = { ...u[i], cantidad: e.target.value }; setCompraItems(u); }}
                    />
                    <Input
                      type="number" placeholder="0" className="h-8 text-sm"
                      value={item.precioUnitario}
                      onChange={(e) => { const u = [...compraItems]; u[i] = { ...u[i], precioUnitario: e.target.value }; setCompraItems(u); }}
                    />
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      disabled={compraItems.length === 1}
                      onClick={() => setCompraItems(compraItems.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {compraItems.some((i) => i.cantidad && i.precioUnitario) && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold">
                  {formatCurrency(compraItems.reduce((s, i) => s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precioUnitario) || 0), 0))}
                </span>
              </div>
            )}

            <div>
              <Label>Observación (opcional)</Label>
              <Input value={compraForm.observacion} onChange={(e) => setCompraForm({ ...compraForm, observacion: e.target.value })} placeholder="Notas de la compra..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompraForm(false)}>Cancelar</Button>
            <Button
              onClick={handleCrearCompra}
              disabled={loading || !compraForm.proveedorId || compraItems.every((i) => !i.productoId || !i.cantidad)}
            >
              {loading ? "Registrando..." : "Registrar Compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalle compra */}
      {showDetalle && (
        <Dialog open onOpenChange={() => setShowDetalle(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de compra — {showDetalle.proveedor?.nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Fecha: <span className="text-foreground font-medium">{formatDate(showDetalle.createdAt)}</span></span>
                <span>Estado: <Badge variant={showDetalle.estado === "RECIBIDA" ? "default" : "outline"} className="ml-1">{showDetalle.estado}</Badge></span>
              </div>
              {showDetalle.observacion && <p className="text-sm text-muted-foreground">{showDetalle.observacion}</p>}
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">P. Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showDetalle.detalles.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.producto?.nombre ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{Number(d.cantidad)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatCurrency(Number(d.precioUnitario))}</TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">{formatCurrency(Number(d.subtotal))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-muted-foreground">{showDetalle.detalles.length} producto(s)</span>
                <span className="text-lg font-bold">{formatCurrency(Number(showDetalle.total))}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
