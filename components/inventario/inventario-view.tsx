"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Package, AlertTriangle, Edit, Trash2, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Categoria {
  id: string;
  nombre: string;
  color: string;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  precioNocturno: number | null;
  costo: number;
  stock: number;
  stockMinimo: number;
  unidad: string;
  activo: boolean;
  categoriaId: string;
  categoria: Categoria;
}

interface InventarioViewProps {
  productos: Producto[];
  categorias: Categoria[];
}

const emptyForm = {
  nombre: "", descripcion: "", precio: "", precioNocturno: "", costo: "", stock: "0",
  stockMinimo: "0", unidad: "und", categoriaId: "", activo: true,
};

export function InventarioView({ productos: initial, categorias }: InventarioViewProps) {
  const [productos, setProductos] = useState(initial);
  const [buscar, setBuscar] = useState("");
  const [catFiltro, setCatFiltro] = useState("todas");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Producto | null>(null);
  const [showMovimiento, setShowMovimiento] = useState<Producto | null>(null);
  const [showCategoria, setShowCategoria] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [catForm, setCatForm] = useState({ nombre: "", color: "#6366f1" });
  const [movForm, setMovForm] = useState({ tipo: "ENTRADA", cantidad: "", motivo: "" });
  const [loading, setLoading] = useState(false);

  async function fetchProductos() {
    const res = await fetch("/api/productos?activos=false");
    if (res.ok) setProductos(await res.json());
  }

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        precio: parseFloat(form.precio),
        precioNocturno: form.precioNocturno ? parseFloat(form.precioNocturno) : null,
        costo: parseFloat(form.costo) || 0,
        categoriaId: form.categoriaId,
        stock: parseFloat(form.stock),
        stockMinimo: parseFloat(form.stockMinimo),
        unidad: form.unidad,
        activo: form.activo,
      }),
    });
    if (res.ok) {
      toast.success("Producto creado");
      setShowCreate(false);
      setForm(emptyForm);
      fetchProductos();
    } else toast.error("Error al crear producto");
    setLoading(false);
  }

  async function handleUpdate() {
    if (!showEdit) return;
    setLoading(true);
    const res = await fetch(`/api/productos/${showEdit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        precio: parseFloat(form.precio),
        precioNocturno: form.precioNocturno ? parseFloat(form.precioNocturno) : null,
        costo: parseFloat(form.costo) || 0,
        categoriaId: form.categoriaId,
        stockMinimo: parseFloat(form.stockMinimo),
        unidad: form.unidad,
        activo: form.activo,
      }),
    });
    if (res.ok) {
      toast.success("Producto actualizado");
      setShowEdit(null);
      fetchProductos();
    } else toast.error("Error al actualizar");
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Producto eliminado"); fetchProductos(); }
  }

  async function handleMovimiento() {
    if (!showMovimiento) return;
    setLoading(true);
    const res = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productoId: showMovimiento.id,
        tipo: movForm.tipo,
        cantidad: parseFloat(movForm.cantidad),
        motivo: movForm.motivo || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Movimiento registrado");
      setShowMovimiento(null);
      setMovForm({ tipo: "ENTRADA", cantidad: "", motivo: "" });
      fetchProductos();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al registrar movimiento");
    }
    setLoading(false);
  }

  async function handleCrearCategoria() {
    setLoading(true);
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    });
    if (res.ok) {
      toast.success("Categoría creada");
      setShowCategoria(false);
      setCatForm({ nombre: "", color: "#6366f1" });
    } else toast.error("Error al crear categoría");
    setLoading(false);
  }

  const productosFiltrados = productos.filter((p) => {
    const matchCat = catFiltro === "todas" || p.categoriaId === catFiltro;
    const matchBuscar = p.nombre.toLowerCase().includes(buscar.toLowerCase());
    return matchCat && matchBuscar;
  });

  const stockBajo = productos.filter((p) => Number(p.stock) <= Number(p.stockMinimo) && p.activo);
  const totalValor = productos.reduce((s, p) => s + Number(p.stock) * Number(p.costo), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total productos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productos.filter((p) => p.activo).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stockBajo.length > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {stockBajo.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalValor)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categorias.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="productos">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="alertas">
              Alertas
              {stockBajo.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 text-xs px-1">
                  {stockBajo.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCategoria(true)}>
              + Categoría
            </Button>
            <Button size="sm" onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Producto
            </Button>
          </div>
        </div>

        <TabsContent value="productos" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={catFiltro} onValueChange={setCatFiltro}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mín.</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosFiltrados.map((p) => {
                  const bajo = Number(p.stock) <= Number(p.stockMinimo);
                  return (
                    <TableRow key={p.id} className={!p.activo ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: p.categoria.color, color: p.categoria.color }}
                        >
                          {p.categoria.nombre}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(p.precio))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(p.costo))}</TableCell>
                      <TableCell className={`text-right font-medium ${bajo ? "text-destructive" : ""}`}>
                        {Number(p.stock).toFixed(1)} {p.unidad}
                        {bajo && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {Number(p.stockMinimo).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.activo ? "default" : "secondary"}>
                          {p.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600"
                            title="Entrada"
                            onClick={() => { setShowMovimiento(p); setMovForm({ tipo: "ENTRADA", cantidad: "", motivo: "" }); }}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-600"
                            title="Salida"
                            onClick={() => { setShowMovimiento(p); setMovForm({ tipo: "SALIDA", cantidad: "", motivo: "" }); }}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ajuste"
                            onClick={() => { setShowMovimiento(p); setMovForm({ tipo: "AJUSTE", cantidad: "", motivo: "" }); }}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setShowEdit(p);
                              setForm({
                                nombre: p.nombre,
                                descripcion: p.descripcion ?? "",
                                precio: String(p.precio),
                                precioNocturno: p.precioNocturno != null ? String(p.precioNocturno) : "",
                                costo: String(p.costo),
                                stock: String(p.stock),
                                stockMinimo: String(p.stockMinimo),
                                unidad: p.unidad,
                                categoriaId: p.categoriaId,
                                activo: p.activo,
                              });
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {productosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="alertas">
          <div className="space-y-3">
            {stockBajo.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-10 w-10 mb-2 opacity-30" />
                <p>No hay alertas de stock</p>
              </div>
            ) : (
              stockBajo.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock actual: <span className="text-destructive font-medium">{Number(p.stock).toFixed(1)} {p.unidad}</span>
                      {" • "}Mínimo: {Number(p.stockMinimo).toFixed(1)} {p.unidad}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => { setShowMovimiento(p); setMovForm({ tipo: "ENTRADA", cantidad: "", motivo: "Reposición de stock" }); }}
                  >
                    <ArrowDown className="h-3 w-3 mr-1" /> Reponer
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      {(showCreate || showEdit) && (
        <Dialog open onOpenChange={() => { setShowCreate(false); setShowEdit(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{showCreate ? "Nuevo Producto" : `Editar: ${showEdit?.nombre}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div>
                  <Label>Precio venta *</Label>
                  <Input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
                </div>
                <div>
                  <Label>Precio nocturno</Label>
                  <Input type="number" value={form.precioNocturno} onChange={(e) => setForm({ ...form, precioNocturno: e.target.value })} placeholder="Vacío = usa precio normal" />
                </div>
                <div>
                  <Label>Costo</Label>
                  <Input type="number" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
                </div>
                <div>
                  <Label>Categoría *</Label>
                  <Select value={form.categoriaId} onValueChange={(v) => setForm({ ...form, categoriaId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidad</Label>
                  <Input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="und, kg, lt..." />
                </div>
                {showCreate && (
                  <div>
                    <Label>Stock inicial</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                  </div>
                )}
                <div>
                  <Label>Stock mínimo</Label>
                  <Input type="number" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setShowEdit(null); }}>Cancelar</Button>
              <Button
                onClick={showCreate ? handleCreate : handleUpdate}
                disabled={loading || !form.nombre || !form.precio || !form.categoriaId}
              >
                {showCreate ? "Crear" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Movimiento Dialog */}
      {showMovimiento && (
        <Dialog open onOpenChange={() => setShowMovimiento(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Movimiento de inventario: {showMovimiento.nombre}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                Stock actual: <span className="font-bold">{Number(showMovimiento.stock).toFixed(1)} {showMovimiento.unidad}</span>
              </div>
              <div>
                <Label>Tipo de movimiento</Label>
                <Select value={movForm.tipo} onValueChange={(v) => setMovForm({ ...movForm, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada (aumentar stock)</SelectItem>
                    <SelectItem value="SALIDA">Salida (reducir stock)</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste (establecer stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cantidad *</Label>
                <Input
                  type="number"
                  value={movForm.cantidad}
                  onChange={(e) => setMovForm({ ...movForm, cantidad: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input
                  value={movForm.motivo}
                  onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })}
                  placeholder="Motivo del movimiento..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMovimiento(null)}>Cancelar</Button>
              <Button onClick={handleMovimiento} disabled={loading || !movForm.cantidad}>
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Categoria Dialog */}
      <Dialog open={showCategoria} onOpenChange={setShowCategoria}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva Categoría</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  value={catForm.color}
                  onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded border border-border"
                />
                <Input value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoria(false)}>Cancelar</Button>
            <Button onClick={handleCrearCategoria} disabled={loading || !catForm.nombre}>
              Crear Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
