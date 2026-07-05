export interface SaleRecord {
  sucursal: string;
  deposito: string;
  fecha: string; // YYYY-MM-DD
  cantidad: number;
}

export interface VentasBreakdown {
  avVesta: number;
  avSupermercado: number;
  r20VestaRuta20: number;
  resto: number;
}

export interface Product {
  proveedor: string;
  codigoProducto: string; // Solapa GENERAL columna B
  descripcion: string; // Solapa GENERAL columna C
  descCorta: string; // Solapa GENERAL columna D
  unidadesPorBulto: number; // Solapa GENERAL columna E
  precioLista: number; // Solapa GENERAL columna F
  tasaIva: number; // Solapa GENERAL columna G
  impInterno: number; // Solapa GENERAL columna H
  vtaWeb: string; // Solapa GENERAL columna I
  fotos: string; // Solapa GENERAL columna J
  fraccionVta: number; // Solapa GENERAL columna K
  cadenaDtos: string; // Solapa GENERAL columna L
  dtosParticulares: string; // Solapa GENERAL columna M
  codProveedor: string; // Solapa GENERAL columna N
  bloqCompra: string; // Solapa GENERAL columna O
  bloqVenta: string; // Solapa GENERAL columna P
  codigoEan: string; // Solapa GENERAL columna Q
  segundoEan: string; // Solapa GENERAL columna R
  ultimoEan: string; // Solapa GENERAL columna S
  gtin14: string; // Solapa GENERAL columna T
  estadoGral: string; // Solapa GENERAL columna U
  cjaXPallet: number; // Solapa GENERAL columna V
  cjasXCam: number; // Solapa GENERAL columna W
  resultado: string; // Solapa GENERAL columna X

  // Solapa COMPRA
  compraTotal: number; // Columna I

  // Solapa VENTA (Agregado)
  ventaTotal: number; // Columna J
  ventas: SaleRecord[];
  ventasBreakdown: VentasBreakdown;

  // Fechas y Métricas de Venta
  fechaPrimeraVenta: string;
  fechaUltimaVenta: string;
  vidaUtilDias: number;
  estadoQuiebre: 'ANTES_NOVIEMBRE' | 'PRIMERA_QUINCENA_NOVIEMBRE' | 'SEGUNDA_QUINCENA_NOVIEMBRE' | 'DICIEMBRE_1_A_4' | 'OTRO_SIN_QUIEBRE';
  fotoBase64?: string;
  comentarioCorto?: string;
}

export interface AppUser {
  nombre: string;
  legajo: string;
  clave: string;
  rol: 'ADMIN' | 'USUARIO';
}

export interface OrderItem {
  codigoProducto: string;
  descripcion: string;
  proveedor: string;
  codProveedor: string;
  precioLista: number;
  cantidadPedir: number;
  ultimoEan: string;
}

export interface SavedOrder {
  id: string;
  fecha: string;
  proveedor: string;
  items: OrderItem[];
  total: number;
}
