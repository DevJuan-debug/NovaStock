"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { usePosStore } from "@/hooks/use-pos-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Search,
  CreditCard,
  RefreshCw,
  UtensilsCrossed,
  Trophy,
  Save,
  CheckCircle,
  Moon,
  Tag,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Categoria {
  id: string;
  nombre: string;
  color: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  precioNocturno: number | null;
  stock: number;
  categoriaId: string;
  categoria: Categoria;
}

interface Promocion {
  id: string;
  nombre: string;
  tipo: "PORCENTAJE" | "MONTO";
  valor: number;
  productoId: string | null;
}

interface Mesa {
  id: string;
  numero: number;
  nombre: string | null;
  estado: string;
}

interface Bolirana {
  id: string;
  numero: number;
  nombre: string | null;
  estado: string;
}

interface VentaAbierta {
  id: string;
  mesaId: string | null;
  boliranaId: string | null;
  numero: string;
  descuento: number;
  propina: number;
  esNocturno: boolean;
  detalles: {
    productoId: string;
    producto: { nombre: string };
    precioUnitario: number;
    cantidad: number;
    descuento: number;
    subtotal: number;
  }[];
}

interface PosViewProps {
  productos: Producto[];
  categorias: Categoria[];
  mesas: Mesa[];
  boliranas: Bolirana[];
  promociones: Promocion[];
  config: { horaInicioNocturno: string };
  initialMesaId?: string | null;
  initialBoliranaId?: string | null;
  ventaAbierta?: VentaAbierta | null;
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "NEQUI", label: "Nequi" },
  { value: "DAVIPLATA", label: "Daviplata" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

async function cargarVentaAbierta(tipo: "mesa" | "bolirana", id: string): Promise<boolean> {
  try {
    const param = tipo === "mesa" ? `mesaId=${id}` : `boliranaId=${id}`;
    const res = await fetch(`/api/ventas?estado=ABIERTA&${param}&limit=1`);
    if (!res.ok) return false;
    const { ventas } = await res.json();
    if (!ventas?.[0]) return false;
    const ventaRes = await fetch(`/api/ventas/${ventas[0].id}`);
    if (!ventaRes.ok) return false;
    return ventaRes.json().then((v) => {
      usePosStore.getState().loadFromVenta(v);
      return true;
    });
  } catch {
    return false;
  }
}

function isNocturnoAhora(horaInicioNocturno: string): boolean {
  const [hStr, mStr] = horaInicioNocturno.split(":");
  const ahora = new Date();
  const h = parseInt(hStr ?? "22");
  const m = parseInt(mStr ?? "0");
  return ahora.getHours() > h || (ahora.getHours() === h && ahora.getMinutes() >= m);
}

export function PosView({ productos, categorias, mesas, boliranas, promociones, config, initialMesaId, initialBoliranaId, ventaAbierta }: PosViewProps) {
  const store = usePosStore();
  const [buscar, setBuscar] = useState("");
  const [catActiva, setCatActiva] = useState<string>("todas");
  const [showPago, setShowPago] = useState(false);
  const [efectivoRecibido, setEfectivoRecibido] = useState("");
  const [loadingPago, setLoadingPago] = useState(false);
  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [loadingSelector, setLoadingSelector] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (ventaAbierta) {
      store.loadFromVenta(ventaAbierta);
    } else {
      if (initialMesaId) store.setMesa(initialMesaId);
      else if (initialBoliranaId) store.setBolirana(initialBoliranaId);
      store.setEsNocturno(isNocturnoAhora(config.horaInicioNocturno));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMesaChange(mesaId: string) {
    if (store.ventaAbiertoId && store.mesaId !== mesaId) {
      toast.warning("Primero paga o limpia la cuenta abierta antes de cambiar de mesa");
      return;
    }
    if (mesaId === "ninguna") { store.setMesa(null); return; }
    const mesa = mesas.find((m) => m.id === mesaId);
    if (mesa?.estado === "OCUPADA") {
      setLoadingSelector(true);
      const cargado = await cargarVentaAbierta("mesa", mesaId);
      setLoadingSelector(false);
      if (cargado) toast.info(`Cuenta de Mesa ${mesa.numero} cargada`);
      else store.setMesa(mesaId);
    } else {
      store.setMesa(mesaId);
    }
  }

  async function handleBoliranaChange(boliranaId: string) {
    if (store.ventaAbiertoId && store.boliranaId !== boliranaId) {
      toast.warning("Primero paga o limpia la cuenta abierta antes de cambiar de bolirana");
      return;
    }
    if (boliranaId === "ninguna") { store.setBolirana(null); return; }
    const bolirana = boliranas.find((b) => b.id === boliranaId);
    if (bolirana?.estado === "EN_USO") {
      setLoadingSelector(true);
      const cargado = await cargarVentaAbierta("bolirana", boliranaId);
      setLoadingSelector(false);
      if (cargado) toast.info(`Cuenta de Bolirana ${bolirana.numero} cargada`);
      else store.setBolirana(boliranaId);
    } else {
      store.setBolirana(boliranaId);
    }
  }

  const productosFiltrados = productos.filter((p) => {
    const matchCat = catActiva === "todas" || p.categoriaId === catActiva;
    const matchBuscar = p.nombre.toLowerCase().includes(buscar.toLowerCase());
    return matchCat && matchBuscar;
  });

  function getPromoForProduct(producto: Producto): Promocion | undefined {
    return (
      promociones.find((p) => p.productoId === producto.id) ??
      promociones.find((p) => p.productoId === null)
    );
  }

  function addToCart(producto: Producto) {
    const precio = (store.esNocturno && producto.precioNocturno != null)
      ? Number(producto.precioNocturno)
      : Number(producto.precio);

    const promo = getPromoForProduct(producto);
    let descuento = 0;
    if (promo) {
      descuento = promo.tipo === "PORCENTAJE"
        ? promo.valor
        : Math.min(100, (promo.valor / precio) * 100);
    }

    store.addItem({ productoId: producto.id, nombre: producto.nombre, precio, cantidad: 1, descuento });

    const extras = [
      store.esNocturno && producto.precioNocturno ? "precio nocturno" : null,
      promo ? `promo ${promo.nombre}` : null,
    ].filter(Boolean).join(", ");
    toast.success(`${producto.nombre} agregado${extras ? ` (${extras})` : ""}`, { duration: 1200 });
  }

  async function handleGuardarPedido() {
    if (store.items.length === 0) {
      toast.error("Agrega productos antes de guardar");
      return;
    }
    setLoadingGuardar(true);
    const body = {
      mesaId: store.mesaId,
      boliranaId: store.boliranaId,
      esNocturno: store.esNocturno,
      items: store.items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        precioUnitario: i.precio,
        descuento: i.descuento,
        subtotal: i.subtotal,
      })),
      descuento: store.descuentoGlobal,
      propina: store.totalPropina(),
      observacion: store.observacion,
    };

    try {
      if (store.ventaAbiertoId) {
        const res = await fetch(`/api/ventas/${store.ventaAbiertoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast.success("Pedido actualizado");
      } else {
        const res = await fetch("/api/ventas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, estado: "ABIERTA" }),
        });
        if (!res.ok) throw new Error();
        const venta = await res.json();
        store.setVentaAbierta(venta.id);
        toast.success("Cuenta abierta correctamente");
      }
    } catch {
      toast.error("Error al guardar el pedido");
    }
    setLoadingGuardar(false);
  }

  async function handlePagar() {
    if (store.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setLoadingPago(true);

    try {
      if (store.ventaAbiertoId) {
        // First update items in case new ones were added, then pay
        await fetch(`/api/ventas/${store.ventaAbiertoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mesaId: store.mesaId,
            boliranaId: store.boliranaId,
            items: store.items.map((i) => ({
              productoId: i.productoId,
              cantidad: i.cantidad,
              precioUnitario: i.precio,
              descuento: i.descuento,
              subtotal: i.subtotal,
            })),
            descuento: store.descuentoGlobal,
            propina: store.totalPropina(),
          }),
        });

        const res = await fetch(`/api/ventas/${store.ventaAbiertoId}/pagar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metodoPago: store.metodoPago,
            propina: store.totalPropina(),
            descuento: store.descuentoGlobal,
          }),
        });
        if (!res.ok) throw new Error();
        const venta = await res.json();
        toast.success(`Venta ${venta.numero} pagada exitosamente`);
      } else {
        const res = await fetch("/api/ventas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mesaId: store.mesaId,
            boliranaId: store.boliranaId,
            esNocturno: store.esNocturno,
            items: store.items.map((i) => ({
              productoId: i.productoId,
              cantidad: i.cantidad,
              precioUnitario: i.precio,
              descuento: i.descuento,
              subtotal: i.subtotal,
            })),
            descuento: store.descuentoGlobal,
            propina: store.totalPropina(),
            metodoPago: store.metodoPago,
            observacion: store.observacion,
            estado: "PAGADA",
          }),
        });
        if (!res.ok) throw new Error();
        const venta = await res.json();
        toast.success(`Venta ${venta.numero} registrada exitosamente`);
      }

      store.clearCart();
      setShowPago(false);
      setEfectivoRecibido("");
    } catch {
      toast.error("Error al procesar la venta");
    }
    setLoadingPago(false);
  }

  const cambio =
    store.metodoPago === "EFECTIVO" && efectivoRecibido
      ? parseFloat(efectivoRecibido) - store.total()
      : null;

  const tieneCuentaAbierta = !!store.ventaAbiertoId;

  return (
    <div className="flex h-full">
      {/* Panel izquierdo: Productos */}
      <div className="flex flex-col flex-1 border-r border-border overflow-hidden">
        {/* Buscador + Categorías */}
        <div className="p-4 space-y-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Buscar productos..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              <Button
                size="sm"
                variant={catActiva === "todas" ? "default" : "outline"}
                onClick={() => setCatActiva("todas")}
                className="flex-shrink-0 text-xs h-7"
              >
                Todas
              </Button>
              {categorias.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={catActiva === cat.id ? "default" : "outline"}
                  onClick={() => setCatActiva(cat.id)}
                  className="flex-shrink-0 text-xs h-7"
                  style={catActiva === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.nombre}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Productos Grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {productosFiltrados.map((producto) => {
              const promo = getPromoForProduct(producto);
              const precioMostrar = (store.esNocturno && producto.precioNocturno != null)
                ? Number(producto.precioNocturno)
                : Number(producto.precio);
              const tieneNocturno = producto.precioNocturno != null;
              return (
                <button
                  key={producto.id}
                  onClick={() => addToCart(producto)}
                  disabled={Number(producto.stock) <= 0}
                  className="group relative flex flex-col items-center p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {/* Badges */}
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5 items-end">
                    {promo && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-500 text-white leading-none">
                        <Tag className="h-2 w-2" />{promo.tipo === "PORCENTAJE" ? `-${promo.valor}%` : `-${formatCurrency(promo.valor)}`}
                      </span>
                    )}
                    {tieneNocturno && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-500 text-white leading-none">
                        <Moon className="h-2 w-2" />
                      </span>
                    )}
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-white text-lg font-bold"
                    style={{ backgroundColor: producto.categoria.color }}
                  >
                    {producto.nombre.charAt(0)}
                  </div>
                  <p className="text-xs font-medium text-center line-clamp-2 leading-tight">
                    {producto.nombre}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${store.esNocturno && tieneNocturno ? "text-indigo-500" : "text-primary"}`}>
                    {formatCurrency(precioMostrar)}
                  </p>
                  {store.esNocturno && tieneNocturno && (
                    <p className="text-[10px] text-muted-foreground line-through">
                      {formatCurrency(Number(producto.precio))}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Stock: {Number(producto.stock).toFixed(0)}
                  </p>
                </button>
              );
            })}
          </div>
          {productosFiltrados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Panel derecho: Carrito */}
      <div className="flex flex-col w-96 bg-card">
        {/* Mesa / Bolirana selector + estado cuenta */}
        <div className="p-4 border-b border-border space-y-2">
          {tieneCuentaAbierta && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30">
              <CheckCircle className="h-3 w-3 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-700 font-medium">Cuenta abierta — puedes seguir agregando</span>
            </div>
          )}
          {store.esNocturno && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30">
              <Moon className="h-3 w-3 text-indigo-500 flex-shrink-0" />
              <span className="text-xs text-indigo-600 font-medium">Precio nocturno activo — desde {config.horaInicioNocturno}</span>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <UtensilsCrossed className="h-3 w-3" /> Mesa
              </Label>
              <Select
                value={store.mesaId ?? "ninguna"}
                onValueChange={handleMesaChange}
                disabled={loadingSelector}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin mesa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">Sin mesa</SelectItem>
                  {mesas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      Mesa {m.numero}{m.nombre ? ` (${m.nombre})` : ""}{m.estado === "OCUPADA" ? " ●" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Trophy className="h-3 w-3" /> Bolirana
              </Label>
              <Select
                value={store.boliranaId ?? "ninguna"}
                onValueChange={handleBoliranaChange}
                disabled={loadingSelector}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin bolirana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">Sin bolirana</SelectItem>
                  {boliranas.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Bolirana {b.numero}{b.estado === "EN_USO" ? " ●" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Items */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {store.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Carrito vacío</p>
                <p className="text-xs">Selecciona productos del menú</p>
              </div>
            ) : (
              store.items.map((item) => (
                <div
                  key={item.productoId}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.precio)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        item.cantidad > 1
                          ? store.updateCantidad(item.productoId, item.cantidad - 1)
                          : store.removeItem(item.productoId)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium w-5 text-center">{item.cantidad}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => store.updateCantidad(item.productoId, item.cantidad + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-xs font-semibold">{formatCurrency(item.subtotal)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => store.removeItem(item.productoId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Descuento y propina */}
        {store.items.length > 0 && (
          <div className="p-3 border-t border-border space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Descuento %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={store.descuentoGlobal || ""}
                  onChange={(e) => store.setDescuentoGlobal(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Propina %</Label>
                <Input
                  type="number"
                  min="0"
                  value={store.propina || ""}
                  onChange={(e) =>
                    store.setPropina(parseFloat(e.target.value) || 0, "porcentaje")
                  }
                  className="h-8 text-xs"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Totales + Acciones */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(store.subtotal())}</span>
          </div>
          {store.descuentoGlobal > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>Descuento ({store.descuentoGlobal}%)</span>
              <span>-{formatCurrency(store.totalDescuento())}</span>
            </div>
          )}
          {store.propina > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Propina</span>
              <span>+{formatCurrency(store.totalPropina())}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(store.total())}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => store.clearCart()}
              disabled={store.items.length === 0}
              className="h-8 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGuardarPedido}
              disabled={store.items.length === 0 || loadingGuardar}
              className="flex-1 h-8 text-xs"
            >
              <Save className="h-3 w-3 mr-1" />
              {loadingGuardar ? "Guardando..." : tieneCuentaAbierta ? "Actualizar" : "Guardar pedido"}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPago(true)}
              disabled={store.items.length === 0}
              className="flex-1 h-8 text-xs"
            >
              <CreditCard className="h-3 w-3 mr-1" /> Pagar
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog de pago */}
      <Dialog open={showPago} onOpenChange={setShowPago}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(store.subtotal())}</span>
              </div>
              {store.totalDescuento() > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Descuento</span>
                  <span>-{formatCurrency(store.totalDescuento())}</span>
                </div>
              )}
              {store.totalPropina() > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Propina</span>
                  <span>+{formatCurrency(store.totalPropina())}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total a pagar</span>
                <span>{formatCurrency(store.total())}</span>
              </div>
            </div>

            <div>
              <Label>Método de pago</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {METODOS_PAGO.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => store.setMetodoPago(m.value)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                      store.metodoPago === m.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {store.metodoPago === "EFECTIVO" && (
              <div>
                <Label>Efectivo recibido</Label>
                <Input
                  type="number"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
                {cambio !== null && cambio >= 0 && (
                  <p className="text-sm text-emerald-600 mt-1 font-medium">
                    Cambio: {formatCurrency(cambio)}
                  </p>
                )}
                {cambio !== null && cambio < 0 && (
                  <p className="text-sm text-destructive mt-1">
                    Falta: {formatCurrency(Math.abs(cambio))}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{store.items.length} productos</Badge>
              {store.mesaId && <Badge variant="outline"><UtensilsCrossed className="h-3 w-3 mr-1" />Mesa</Badge>}
              {store.boliranaId && <Badge variant="outline"><Trophy className="h-3 w-3 mr-1" />Bolirana</Badge>}
              {tieneCuentaAbierta && <Badge variant="outline" className="text-amber-600 border-amber-500/30">Cuenta abierta</Badge>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPago(false)} disabled={loadingPago}>
              Cancelar
            </Button>
            <Button onClick={handlePagar} disabled={loadingPago} className="gap-2">
              <CreditCard className="h-4 w-4" />
              {loadingPago ? "Procesando..." : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
