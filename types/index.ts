export type {
  User,
  Mesa,
  Bolirana,
  Categoria,
  Producto,
  Venta,
  DetalleVenta,
  SesionBolirana,
  MovimientoInventario,
  Proveedor,
  Compra,
  DetalleCompra,
  MovimientoCaja,
  CierreCaja,
  Auditoria,
  Role,
  EstadoMesa,
  EstadoBolirana,
  TipoMovimientoInventario,
  TipoMovimientoCaja,
  MetodoPago,
  EstadoVenta,
  EstadoCompra,
} from "../app/generated/prisma/client";

export interface DashboardStats {
  ventasHoy: number;
  ventasMes: number;
  mesasOcupadas: number;
  boliranasEnUso: number;
  productosStockBajo: number;
  totalProductos: number;
}

export interface CartItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  descuento: number;
  subtotal: number;
}
