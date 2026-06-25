"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Clock, Edit, Trash2, UtensilsCrossed, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

type EstadoMesa = "DISPONIBLE" | "OCUPADA" | "RESERVADA" | "MANTENIMIENTO";

interface Mesa {
  id: string;
  numero: number;
  nombre: string | null;
  capacidad: number;
  estado: EstadoMesa;
  zona: string | null;
  ventas: { id: string; total: number; estado: string; detalles: { subtotal: number }[] }[];
}

const estadoConfig: Record<EstadoMesa, { label: string; color: string; bg: string; border: string }> = {
  DISPONIBLE: { label: "Disponible", color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  OCUPADA: { label: "Ocupada", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  RESERVADA: { label: "Reservada", color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  MANTENIMIENTO: { label: "Mantenimiento", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
};

interface MesasViewProps {
  initialMesas: Mesa[];
}

export function MesasView({ initialMesas }: MesasViewProps) {
  const [mesas, setMesas] = useState(initialMesas);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Mesa | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: "", capacidad: "4", zona: "" });

  async function fetchMesas() {
    const res = await fetch("/api/mesas");
    if (res.ok) setMesas(await res.json());
  }

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/mesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        capacidad: parseInt(form.capacidad),
        zona: form.zona || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Mesa creada correctamente");
      setShowCreate(false);
      setForm({ nombre: "", capacidad: "4", zona: "" });
      fetchMesas();
    } else {
      toast.error("Error al crear la mesa");
    }
    setLoading(false);
  }

  async function handleCambiarEstado(id: string, estado: EstadoMesa) {
    const res = await fetch(`/api/mesas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      toast.success("Estado actualizado");
      fetchMesas();
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta mesa?")) return;
    const res = await fetch(`/api/mesas/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Mesa eliminada");
      fetchMesas();
    }
  }

  const [refreshing, setRefreshing] = useState(false);
  const disponibles = mesas.filter((m) => m.estado === "DISPONIBLE").length;
  const ocupadas = mesas.filter((m) => m.estado === "OCUPADA").length;
  const reservadas = mesas.filter((m) => m.estado === "RESERVADA").length;

  async function handleRefresh() {
    setRefreshing(true);
    await fetchMesas();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      {/* Summary + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
            {disponibles} disponibles
          </Badge>
          <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
            {ocupadas} ocupadas
          </Badge>
          {reservadas > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-500/10">
              {reservadas} reservadas
            </Badge>
          )}
          <Badge variant="outline">{mesas.length} total</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Mesa
          </Button>
        </div>
      </div>

      {/* Mesa Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {mesas.map((mesa) => {
          const config = estadoConfig[mesa.estado];
          const ventaAbierta = mesa.ventas.find((v) => v.estado === "ABIERTA") ?? mesa.ventas[0];
          const totalVenta = ventaAbierta
            ? ventaAbierta.detalles.reduce((s, d) => s + Number(d.subtotal), 0)
            : 0;
          const itemCount = ventaAbierta?.detalles.length ?? 0;

          return (
            <Card
              key={mesa.id}
              className={`cursor-pointer transition-all hover:shadow-md ${config.bg} ${config.border} border-2`}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold leading-tight">{mesa.nombre ?? `Mesa ${mesa.numero}`}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowEdit(mesa)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleEliminar(mesa.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{mesa.capacidad} personas</span>
                </div>
                {mesa.zona && (
                  <div className="text-xs text-muted-foreground">{mesa.zona}</div>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs w-full justify-center ${config.color} ${config.border}`}
                >
                  {config.label}
                </Badge>
                {ventaAbierta && totalVenta > 0 && (
                  <div className="text-center">
                    <p className="text-sm font-bold">{formatCurrency(totalVenta)}</p>
                    <p className="text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? "producto" : "productos"}</p>
                  </div>
                )}
                {mesa.estado === "DISPONIBLE" && (
                  <Link href={`/pos?mesa=${mesa.id}`}>
                    <Button size="sm" className="w-full h-7 text-xs mt-1">
                      <UtensilsCrossed className="h-3 w-3 mr-1" /> Abrir cuenta
                    </Button>
                  </Link>
                )}
                {mesa.estado === "OCUPADA" && (
                  <div className="flex gap-1">
                    <Link href={`/pos?mesa=${mesa.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                        Ver cuenta
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleCambiarEstado(mesa.id, "DISPONIBLE")}
                    >
                      <Clock className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {(mesa.estado === "MANTENIMIENTO" || mesa.estado === "RESERVADA") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs"
                    onClick={() => handleCambiarEstado(mesa.id, "DISPONIBLE")}
                  >
                    Marcar disponible
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {mesas.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UtensilsCrossed className="h-12 w-12 mb-3 opacity-30" />
            <p>No hay mesas registradas</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
              Crear primera mesa
            </Button>
          </div>
        )}
      </div>

      {/* Estado change context */}
      {showEdit && (
        <Dialog open onOpenChange={() => setShowEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar {showEdit.nombre ?? `Mesa ${showEdit.numero}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Estado</Label>
                <Select
                  defaultValue={showEdit.estado}
                  onValueChange={(v) =>
                    handleCambiarEstado(showEdit.id, v as EstadoMesa).then(() => setShowEdit(null))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                    <SelectItem value="OCUPADA">Ocupada</SelectItem>
                    <SelectItem value="RESERVADA">Reservada</SelectItem>
                    <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Mesa 1, VIP, Terraza..."
              />
            </div>
            <div>
              <Label>Capacidad</Label>
              <Input
                type="number"
                value={form.capacidad}
                onChange={(e) => setForm({ ...form, capacidad: e.target.value })}
                placeholder="4"
              />
            </div>
            <div>
              <Label>Zona (opcional)</Label>
              <Input
                value={form.zona}
                onChange={(e) => setForm({ ...form, zona: e.target.value })}
                placeholder="Interior, Exterior, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading || !form.nombre}>
              Crear Mesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
