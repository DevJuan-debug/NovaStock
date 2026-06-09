"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Plus, Trophy, DollarSign, Play, Square, Trash2, Clock, LogIn, LogOut, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

type EstadoBolirana = "DISPONIBLE" | "EN_USO" | "MANTENIMIENTO";

interface Sesion {
  id: string;
  inicio: string;
  fin: string | null;
  duracion: number | null;
  costo: number | null;
}

interface Bolirana {
  id: string;
  numero: number;
  nombre: string | null;
  estado: EstadoBolirana;
  precioPorHora: number;
  sesiones: Sesion[];
  ventas: { id: string; total: number }[];
}

const estadoConfig: Record<EstadoBolirana, { label: string; bg: string; border: string; color: string }> = {
  DISPONIBLE: { label: "Disponible", color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  EN_USO: { label: "En uso", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  MANTENIMIENTO: { label: "Mantenimiento", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30" },
};

function BoliranaTimer({ inicio, precioPorHora }: { inicio: string; precioPorHora: number }) {
  const [elapsed, setElapsed] = useState(0); // seconds

  useEffect(() => {
    const start = new Date(inicio).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [inicio]);

  const horas = Math.floor(elapsed / 3600);
  const minutos = Math.floor((elapsed % 3600) / 60);
  const segundos = elapsed % 60;
  const duracionStr = horas > 0
    ? `${horas}h ${String(minutos).padStart(2, "0")}m ${String(segundos).padStart(2, "0")}s`
    : `${String(minutos).padStart(2, "0")}m ${String(segundos).padStart(2, "0")}s`;

  const costoAcumulado = (elapsed / 3600) * Number(precioPorHora);
  const progresoHora = ((elapsed % 3600) / 3600) * 100; // % de la hora actual
  const horasCompletas = Math.floor(elapsed / 3600);

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <LogIn className="h-3 w-3" />
          <span>{format(new Date(inicio), "hh:mm a")}</span>
        </div>
        <span className="font-mono font-semibold text-amber-600">{duracionStr}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {horasCompletas > 0 ? `${horasCompletas}h completa${horasCompletas > 1 ? "s" : ""} + ` : ""}
            {Math.round(progresoHora)}% de la hora
          </span>
        </div>
        <Progress value={progresoHora} className="h-1.5" />
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-amber-700">
        <DollarSign className="h-3 w-3" />
        <span>{formatCurrency(costoAcumulado)}</span>
      </div>
    </div>
  );
}

export function BoliranaView({ initialBoliranas }: { initialBoliranas: Bolirana[] }) {
  const [boliranas, setBoliranas] = useState(initialBoliranas);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ numero: "", nombre: "", precioPorHora: "20000" });

  async function fetchBoliranas() {
    const res = await fetch("/api/boliranas");
    if (res.ok) setBoliranas(await res.json());
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchBoliranas();
    setRefreshing(false);
  }

  async function handleCreate() {
    setLoading("create");
    const res = await fetch("/api/boliranas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: parseInt(form.numero),
        nombre: form.nombre || undefined,
        precioPorHora: parseFloat(form.precioPorHora),
      }),
    });
    if (res.ok) {
      toast.success("Bolirana creada");
      setShowCreate(false);
      setForm({ numero: "", nombre: "", precioPorHora: "20000" });
      fetchBoliranas();
    } else toast.error("Error al crear bolirana");
    setLoading(null);
  }

  async function handleIniciarSesion(bolirana: Bolirana) {
    setLoading(bolirana.id);
    const venta = bolirana.ventas[0];
    if (!venta) {
      toast.error("Primero abre una cuenta para esta bolirana desde el POS");
      setLoading(null);
      return;
    }
    const res = await fetch(`/api/boliranas/${bolirana.id}/sesion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "iniciar", ventaId: venta.id }),
    });
    if (res.ok) {
      toast.success("Sesión iniciada");
      fetchBoliranas();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Error al iniciar sesión");
    }
    setLoading(null);
  }

  async function handleFinalizarSesion(boliranaId: string) {
    setLoading(boliranaId);
    const res = await fetch(`/api/boliranas/${boliranaId}/sesion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "finalizar" }),
    });
    if (res.ok) {
      const sesion = await res.json();
      toast.success(`Sesión finalizada · ${formatCurrency(sesion.costo)}`);
      fetchBoliranas();
    } else toast.error("Error al finalizar sesión");
    setLoading(null);
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta bolirana?")) return;
    const res = await fetch(`/api/boliranas/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Bolirana eliminada");
      fetchBoliranas();
    }
  }

  const disponibles = boliranas.filter((b) => b.estado === "DISPONIBLE").length;
  const enUso = boliranas.filter((b) => b.estado === "EN_USO").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
            {disponibles} disponibles
          </Badge>
          <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
            {enUso} en uso
          </Badge>
          <Badge variant="outline">{boliranas.length} total</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Bolirana
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {boliranas.map((b) => {
          const config = estadoConfig[b.estado];
          const sesionActiva = b.sesiones[0];

          return (
            <Card key={b.id} className={`transition-all hover:shadow-md ${config.bg} ${config.border} border-2`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Bolirana {b.numero}
                    </CardTitle>
                    {b.nombre && <p className="text-xs text-muted-foreground mt-0.5">{b.nombre}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleEliminar(b.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatCurrency(Number(b.precioPorHora))}/hora</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${config.color} ${config.border}`}>
                    {config.label}
                  </Badge>
                </div>

                {sesionActiva && (
                  <BoliranaTimer inicio={sesionActiva.inicio} precioPorHora={b.precioPorHora} />
                )}

                {/* Sesiones anteriores del día */}
                {!sesionActiva && b.sesiones.length > 0 && b.sesiones[0].fin && (
                  <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                    <p className="font-medium text-foreground">Última sesión:</p>
                    <div className="flex items-center gap-2">
                      <LogIn className="h-3 w-3" />
                      <span>{format(new Date(b.sesiones[0].inicio), "hh:mm a")}</span>
                      <LogOut className="h-3 w-3 ml-1" />
                      <span>{b.sesiones[0].fin ? format(new Date(b.sesiones[0].fin), "hh:mm a") : "—"}</span>
                    </div>
                    {b.sesiones[0].duracion != null && (
                      <div className="flex items-center justify-between">
                        <span>{Math.floor(Number(b.sesiones[0].duracion) / 60)}h {Number(b.sesiones[0].duracion) % 60}min</span>
                        {b.sesiones[0].costo != null && (
                          <span className="font-semibold">{formatCurrency(Number(b.sesiones[0].costo))}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  {b.estado === "DISPONIBLE" && (
                    <div className="space-y-1.5">
                      <Link href={`/pos?bolirana=${b.id}`} className="block">
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                          Abrir cuenta en POS
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => handleIniciarSesion(b)}
                        disabled={loading === b.id || b.ventas.length === 0}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {b.ventas.length === 0 ? "Abre cuenta primero" : "Iniciar tiempo"}
                      </Button>
                    </div>
                  )}
                  {b.estado === "EN_USO" && (
                    <div className="space-y-1.5">
                      <Link href={`/pos?bolirana=${b.id}`} className="block">
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                          Ver cuenta en POS
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full h-7 text-xs"
                        onClick={() => handleFinalizarSesion(b.id)}
                        disabled={loading === b.id}
                      >
                        <Square className="h-3 w-3 mr-1" /> Finalizar sesión
                      </Button>
                    </div>
                  )}
                  {b.estado === "MANTENIMIENTO" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs"
                      onClick={async () => {
                        await fetch(`/api/boliranas/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: "DISPONIBLE" }) });
                        fetchBoliranas();
                      }}
                    >
                      Marcar disponible
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {boliranas.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Trophy className="h-12 w-12 mb-3 opacity-30" />
            <p>No hay boliranas registradas</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
              Crear primera bolirana
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Bolirana</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número *</Label>
                <Input
                  type="number"
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                />
              </div>
              <div>
                <Label>Precio/hora (COP)</Label>
                <Input
                  type="number"
                  value={form.precioPorHora}
                  onChange={(e) => setForm({ ...form, precioPorHora: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Nombre (opcional)</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Profesional, Estándar..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={loading === "create" || !form.numero}>
              Crear Bolirana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
