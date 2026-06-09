import { create } from "zustand";

export interface CartItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  descuento: number;
  subtotal: number;
}

interface PosStore {
  items: CartItem[];
  mesaId: string | null;
  boliranaId: string | null;
  ventaAbiertoId: string | null;
  descuentoGlobal: number;
  propina: number;
  propinaType: "porcentaje" | "monto";
  metodoPago: string;
  observacion: string;
  esNocturno: boolean;

  setMesa: (id: string | null) => void;
  setBolirana: (id: string | null) => void;
  setVentaAbierta: (id: string | null) => void;
  setEsNocturno: (v: boolean) => void;
  loadFromVenta: (venta: {
    id: string;
    mesaId: string | null;
    boliranaId: string | null;
    descuento: number;
    propina: number;
    esNocturno?: boolean;
    detalles: { productoId: string; producto: { nombre: string }; precioUnitario: number; cantidad: number; descuento: number; subtotal: number }[];
  }) => void;
  addItem: (item: Omit<CartItem, "subtotal">) => void;
  removeItem: (productoId: string) => void;
  updateCantidad: (productoId: string, cantidad: number) => void;
  updateDescuento: (productoId: string, descuento: number) => void;
  setDescuentoGlobal: (v: number) => void;
  setPropina: (v: number, type: "porcentaje" | "monto") => void;
  setMetodoPago: (v: string) => void;
  setObservacion: (v: string) => void;
  clearCart: () => void;

  subtotal: () => number;
  totalDescuento: () => number;
  totalPropina: () => number;
  total: () => number;
}

export const usePosStore = create<PosStore>((set, get) => ({
  items: [],
  mesaId: null,
  boliranaId: null,
  ventaAbiertoId: null,
  descuentoGlobal: 0,
  propina: 0,
  propinaType: "porcentaje",
  metodoPago: "EFECTIVO",
  observacion: "",
  esNocturno: false,

  setMesa: (id) => set({ mesaId: id, boliranaId: null }),
  setBolirana: (id) => set({ boliranaId: id, mesaId: null }),
  setVentaAbierta: (id) => set({ ventaAbiertoId: id }),
  setEsNocturno: (v) => set({ esNocturno: v }),

  loadFromVenta: (venta) => set({
    ventaAbiertoId: venta.id,
    mesaId: venta.mesaId,
    boliranaId: venta.boliranaId,
    esNocturno: venta.esNocturno ?? false,
    items: venta.detalles.map((d) => ({
      productoId: d.productoId,
      nombre: d.producto.nombre,
      precio: Number(d.precioUnitario),
      cantidad: Number(d.cantidad),
      descuento: Number(d.descuento),
      subtotal: Number(d.subtotal),
    })),
  }),

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productoId === item.productoId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productoId === item.productoId
              ? { ...i, cantidad: i.cantidad + item.cantidad, subtotal: (i.cantidad + item.cantidad) * i.precio * (1 - i.descuento / 100) }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { ...item, subtotal: item.cantidad * item.precio * (1 - item.descuento / 100) },
        ],
      };
    }),

  removeItem: (productoId) =>
    set((state) => ({ items: state.items.filter((i) => i.productoId !== productoId) })),

  updateCantidad: (productoId, cantidad) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId
          ? { ...i, cantidad, subtotal: cantidad * i.precio * (1 - i.descuento / 100) }
          : i
      ),
    })),

  updateDescuento: (productoId, descuento) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId
          ? { ...i, descuento, subtotal: i.cantidad * i.precio * (1 - descuento / 100) }
          : i
      ),
    })),

  setDescuentoGlobal: (v) => set({ descuentoGlobal: v }),
  setPropina: (v, type) => set({ propina: v, propinaType: type }),
  setMetodoPago: (v) => set({ metodoPago: v }),
  setObservacion: (v) => set({ observacion: v }),

  clearCart: () =>
    set({
      items: [],
      mesaId: null,
      boliranaId: null,
      ventaAbiertoId: null,
      descuentoGlobal: 0,
      propina: 0,
      propinaType: "porcentaje",
      metodoPago: "EFECTIVO",
      observacion: "",
      esNocturno: false,
    }),

  subtotal: () => get().items.reduce((s, i) => s + i.subtotal, 0),
  totalDescuento: () => {
    const s = get().subtotal();
    return s * (get().descuentoGlobal / 100);
  },
  totalPropina: () => {
    const base = get().subtotal() - get().totalDescuento();
    if (get().propinaType === "porcentaje") return base * (get().propina / 100);
    return get().propina;
  },
  total: () => get().subtotal() - get().totalDescuento() + get().totalPropina(),
}));
