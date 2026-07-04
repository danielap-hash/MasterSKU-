import { Product, SaleRecord, VentasBreakdown } from '../types';

interface RawProduct {
  proveedor: string;
  codigoProducto: string;
  descripcion: string;
  descCorta: string;
  unidadesPorBulto: number;
  precioLista: number;
  tasaIva: number;
  impInterno: number;
  vtaWeb: string;
  fotos: string;
  fraccionVta: number;
  cadenaDtos: string;
  dtosParticulares: string;
  codProveedor: string;
  bloqCompra: string;
  bloqVenta: string;
  codigoEan: string;
  segundoEan: string;
  ultimoEan: string;
  gtin14: string;
  estadoGral: string;
  cjaXPallet: number;
  cjasXCam: number;
  resultado: string;
  compraTotal: number;
  ventas: SaleRecord[];
}

const rawProducts: RawProduct[] = [
  {
    proveedor: "VESTA IMPORT S.A.",
    codigoProducto: "9012714",
    descripcion: "BOLA AGUA PLUMAS DE COLOR FLUO - CELESTE/ROSA",
    descCorta: "PLUMAS COLOR",
    unidadesPorBulto: 1,
    precioLista: 18.83,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "35399/04",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3890541800002",
    segundoEan: "",
    ultimoEan: "3890541800002",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 48,
    cjasXCam: 120,
    resultado: "COMPLETADO",
    compraTotal: 60,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-04", cantidad: 5 },
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-12", cantidad: 8 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-20", cantidad: 10 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-11-28", cantidad: 12 },
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-12-02", cantidad: 10 }, // Última venta: 2 de Dic (Quiebre 1 a 4 de Dic)
      { sucursal: "AV", deposito: "Local Centro", fecha: "2025-12-02", cantidad: 3 } // Resto depósitos
    ]
  },
  {
    proveedor: "VESTA IMPORT S.A.",
    codigoProducto: "9012728",
    descripcion: "CEBOLLA VERDE MULTICOLOR DECORATIVA X3",
    descCorta: "CEBOLLA VERD",
    unidadesPorBulto: 1,
    precioLista: 1.28,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "FR00247",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3890690500006",
    segundoEan: "",
    ultimoEan: "3890690500006",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 20,
    cjasXCam: 50,
    resultado: "COMPLETADO",
    compraTotal: 23,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-02", cantidad: 3 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-08", cantidad: 5 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-14", cantidad: 10 }, // Última venta: 14 de Nov (Quiebre 1° quincena Nov)
      { sucursal: "AV", deposito: "Deposito Aux", fecha: "2025-11-14", cantidad: 2 } // Resto depósitos
    ]
  },
  {
    proveedor: "FIESTAS Y DECORACIONES",
    codigoProducto: "9015508",
    descripcion: "GIRASOL FS10 DECO NAVIDAD - AMARILLO OTOÑAL",
    descCorta: "GIRASOL FS10",
    unidadesPorBulto: 1,
    precioLista: 10.88,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "FS01034/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3890854400005",
    segundoEan: "",
    ultimoEan: "3890854400005",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 10,
    cjasXCam: 40,
    resultado: "COMPLETADO",
    compraTotal: 12,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-10-10", cantidad: 2 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-10-18", cantidad: 4 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-10-24", cantidad: 5 }, // Última venta: 24 de Oct (Quiebre antes de Noviembre)
      { sucursal: "AV", deposito: "Deposito Aux", fecha: "2025-10-24", cantidad: 1 } // Resto depósitos
    ]
  },
  {
    proveedor: "FIESTAS Y DECORACIONES",
    codigoProducto: "9018209",
    descripcion: "MACETA PIEDRA CACTUS NAVIDAD ART.2490",
    descCorta: "MAC.PIED.CAC",
    unidadesPorBulto: 1,
    precioLista: 28.40,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "2490/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3890861000007",
    segundoEan: "",
    ultimoEan: "3890861000007",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 30,
    cjasXCam: 80,
    resultado: "COMPLETADO",
    compraTotal: 23,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-10", cantidad: 4 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-18", cantidad: 5 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-11-25", cantidad: 8 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-28", cantidad: 4 }, // Última venta: 28 de Nov (Quiebre 2° quincena Nov)
      { sucursal: "AV", deposito: "Deposito Sur", fecha: "2025-11-28", cantidad: 1 } // Resto
    ]
  },
  {
    proveedor: "PLASTICOS DEL SUR",
    codigoProducto: "9018540",
    descripcion: "PINO MINI DECO CON MACETA COLOR BLANCO",
    descCorta: "PINO MINI",
    unidadesPorBulto: 1,
    precioLista: 5.42,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "0037128/01BCA",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3890903400000",
    segundoEan: "",
    ultimoEan: "3890903400000",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 100,
    cjasXCam: 250,
    resultado: "COMPLETADO",
    compraTotal: 78,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-10-05", cantidad: 10 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-10-12", cantidad: 20 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-10-20", cantidad: 30 },
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-10-26", cantidad: 10 }, // Última venta: 26 de Oct (Quiebre antes de Noviembre)
      { sucursal: "AV", deposito: "Deposito Oeste", fecha: "2025-10-26", cantidad: 5 } // Resto
    ]
  },
  {
    proveedor: "PLASTICOS DEL SUR",
    codigoProducto: "9018541",
    descripcion: "PAPYRUS VARA ROJA DECORACION NAVIDAD",
    descCorta: "PAPYR.VARA R",
    unidadesPorBulto: 1,
    precioLista: 10.05,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "RM57016/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3890904800007",
    segundoEan: "",
    ultimoEan: "3890904800007",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 50,
    cjasXCam: 120,
    resultado: "COMPLETADO",
    compraTotal: 77,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-05", cantidad: 15 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-15", cantidad: 20 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-11-22", cantidad: 25 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-30", cantidad: 10 }, // Última venta: 30 de Nov (Quiebre 2° quincena Nov)
      { sucursal: "AV", deposito: "Deposito Norte", fecha: "2025-11-30", cantidad: 5 } // Resto
    ]
  },
  {
    proveedor: "FIESTAS Y DECORACIONES",
    codigoProducto: "9018542",
    descripcion: "MANZANA DECO ROJA BRUÑIDA 3,5 PULGADAS",
    descCorta: "MANZANA 3,5\"",
    unidadesPorBulto: 1,
    precioLista: 2.09,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "FR01461/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3890965700001",
    segundoEan: "",
    ultimoEan: "3890965700001",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 120,
    cjasXCam: 300,
    resultado: "COMPLETADO",
    compraTotal: 19,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-01", cantidad: 5 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-10", cantidad: 8 }, // Última venta: 10 de Nov (Quiebre 1° quincena Nov)
      { sucursal: "AV", deposito: "Deposito Este", fecha: "2025-11-10", cantidad: 3 } // Resto
    ]
  },
  {
    proveedor: "FIESTAS Y DECORACIONES",
    codigoProducto: "9018543",
    descripcion: "NAV.PREM.TIGER LILY DECORATIVA ALTA GAMA",
    descCorta: "NAV.PREM.TIG",
    unidadesPorBulto: 1,
    precioLista: 16.90,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NA03122/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892063300008",
    segundoEan: "7796617796611",
    ultimoEan: "17796611933778",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 24,
    cjasXCam: 60,
    resultado: "COMPLETADO",
    compraTotal: 19,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-20", cantidad: 5 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-12-01", cantidad: 8 }, // Última venta: 1 de Dic (Quiebre 1 a 4 de Dic)
      { sucursal: "AV", deposito: "Showroom", fecha: "2025-12-01", cantidad: 4 } // Resto
    ]
  },
  {
    proveedor: "WORLD BALLS S.A.",
    codigoProducto: "9018544",
    descripcion: "PELOTA NAV10 ROJA TEXTURIZADA BRILLO",
    descCorta: "PELOTA NAV10",
    unidadesPorBulto: 1,
    precioLista: 12.50,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAA0005/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892174900005",
    segundoEan: "",
    ultimoEan: "3892174900005",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 40,
    cjasXCam: 100,
    resultado: "COMPLETADO",
    compraTotal: 19,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-15", cantidad: 4 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-24", cantidad: 6 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-12-03", cantidad: 5 }, // Última venta: 3 de Dic (Quiebre 1 a 4 de Dic)
      { sucursal: "AV", deposito: "Deposito Sur", fecha: "2025-12-03", cantidad: 2 } // Resto
    ]
  },
  {
    proveedor: "WORLD BALLS S.A.",
    codigoProducto: "9018558",
    descripcion: "PELOTA NAV6C ESTRELLA PLATA X6 UNID.",
    descCorta: "PELOTA NAV6C",
    unidadesPorBulto: 1,
    precioLista: 6.08,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAA3089/02",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892176900003",
    segundoEan: "",
    ultimoEan: "3892176900003",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 60,
    cjasXCam: 150,
    resultado: "COMPLETADO",
    compraTotal: 120,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-05", cantidad: 20 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-18", cantidad: 30 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-12-05", cantidad: 40 }, // Última venta: 5 de Dic (Sin Quiebre / Después del 4 de Dic)
      { sucursal: "AV", deposito: "Deposito Central", fecha: "2025-12-05", cantidad: 10 } // Resto
    ]
  },
  {
    proveedor: "WORLD BALLS S.A.",
    codigoProducto: "9021126",
    descripcion: "PELOTA NAV 80MM SATIN ORO CON RELIEVE",
    descCorta: "PELOTA NAV 80",
    unidadesPorBulto: 1,
    precioLista: 11.33,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAA9251/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892177500004",
    segundoEan: "",
    ultimoEan: "3892177500004",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 48,
    cjasXCam: 120,
    resultado: "COMPLETADO",
    compraTotal: 60,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-10-15", cantidad: 15 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-10-28", cantidad: 25 }, // Última venta: 28 Oct (Quiebre antes de Noviembre)
      { sucursal: "AV", deposito: "Boutique", fecha: "2025-10-28", cantidad: 5 } // Resto
    ]
  },
  {
    proveedor: "WORLD BALLS S.A.",
    codigoProducto: "9021148",
    descripcion: "PELOTA NAV6C MATE VERDE PINO X6 UNID.",
    descCorta: "PELOTA NAV6C",
    unidadesPorBulto: 1,
    precioLista: 5.74,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAB0260/03",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892178700007",
    segundoEan: "",
    ultimoEan: "3892178700007",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 80,
    cjasXCam: 200,
    resultado: "COMPLETADO",
    compraTotal: 180,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-02", cantidad: 30 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-12", cantidad: 40 }, // Última venta: 12 Nov (Quiebre 1° quincena Nov)
      { sucursal: "AV", deposito: "Deposito Norte", fecha: "2025-11-12", cantidad: 15 } // Resto
    ]
  },
  {
    proveedor: "ARTE NAVIDAD S.A.",
    codigoProducto: "9024333",
    descripcion: "PELOTA ART.NAVIDAD GIGANTE 150MM ESCARCHA",
    descCorta: "PELOTA ART.NA",
    unidadesPorBulto: 1,
    precioLista: 683.01,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAB0260/04",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892178800004",
    segundoEan: "",
    ultimoEan: "3892178800004",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 8,
    cjasXCam: 24,
    resultado: "COMPLETADO",
    compraTotal: 135,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-12", cantidad: 20 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-20", cantidad: 35 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-11-26", cantidad: 40 }, // Última venta: 26 de Nov (Quiebre 2° quincena Nov)
      { sucursal: "AV", deposito: "Deposito Auxiliar", fecha: "2025-11-26", cantidad: 10 } // Resto
    ]
  },
  {
    proveedor: "ARTE NAVIDAD S.A.",
    codigoProducto: "9024335",
    descripcion: "PELOTA ART.NAVIDAD GIGANTE LUXURY 200MM ORO",
    descCorta: "PELOTA ART.NA",
    unidadesPorBulto: 1,
    precioLista: 1183.89,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAB0265/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892180000003",
    segundoEan: "",
    ultimoEan: "3892180000003",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 4,
    cjasXCam: 12,
    resultado: "COMPLETADO",
    compraTotal: 135,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-18", cantidad: 30 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-25", cantidad: 45 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-12-04", cantidad: 30 }, // Última venta: 4 de Dic (Quiebre 1 a 4 de Dic)
      { sucursal: "AV", deposito: "Deposito Sur", fecha: "2025-12-04", cantidad: 10 } // Resto
    ]
  },
  {
    proveedor: "ARTE NAVIDAD S.A.",
    codigoProducto: "9024344",
    descripcion: "PELOTA NAV10 LUXURY COBRE CON FILIGRANAS",
    descCorta: "PELOTA NAV10",
    unidadesPorBulto: 1,
    precioLista: 9.67,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAB0389/02",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892180400001",
    segundoEan: "",
    ultimoEan: "3892180400001",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 48,
    cjasXCam: 120,
    resultado: "COMPLETADO",
    compraTotal: 234,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-10", cantidad: 50 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-20", cantidad: 70 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-12-08", cantidad: 60 }, // Última venta: 8 de Dic (Sin Quiebre / Después del 4 de Dic)
      { sucursal: "AV", deposito: "Deposito Sur", fecha: "2025-12-08", cantidad: 15 } // Resto
    ]
  },
  {
    proveedor: "FIESTAS Y DECORACIONES",
    codigoProducto: "9024352",
    descripcion: "RENO ART.NA1 DE PIE MODELADO RESINA 1.2M",
    descCorta: "RENO ART.NA1",
    unidadesPorBulto: 1,
    precioLista: 3192.26,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NA13433/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892201500000",
    segundoEan: "",
    ultimoEan: "3892201500000",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 2,
    cjasXCam: 6,
    resultado: "COMPLETADO",
    compraTotal: 219,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-20", cantidad: 40 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-12-03", cantidad: 60 }, // Última venta: 3 de Dic (Quiebre 1 a 4 de Dic)
      { sucursal: "AV", deposito: "Showroom", fecha: "2025-12-03", cantidad: 20 } // Resto
    ]
  },
  {
    proveedor: "ARTE NAVIDAD S.A.",
    codigoProducto: "9024360",
    descripcion: "SOMBRERITO ART.NAVIDAD ROJO Y BLANCO DUENDE",
    descCorta: "SOMBRERITO",
    unidadesPorBulto: 1,
    precioLista: 1038.42,
    tasaIva: 21,
    impInterno: 0,
    vtaWeb: "NO",
    fotos: "NO",
    fraccionVta: 0,
    cadenaDtos: "CVL+6",
    dtosParticulares: "CVL+6",
    codProveedor: "NAA0229/01",
    bloqCompra: "NO",
    bloqVenta: "NO",
    codigoEan: "3892206800006",
    segundoEan: "",
    ultimoEan: "3892206800006",
    gtin14: "",
    estadoGral: "01 - Pr...",
    cjaXPallet: 12,
    cjasXCam: 30,
    resultado: "COMPLETADO",
    compraTotal: 60,
    ventas: [
      { sucursal: "AV", deposito: "Supermercado", fecha: "2025-11-10", cantidad: 10 },
      { sucursal: "AV", deposito: "Vesta", fecha: "2025-11-22", cantidad: 15 },
      { sucursal: "R20", deposito: "Vesta Ruta 20", fecha: "2025-11-29", cantidad: 20 }, // Última venta: 29 de Nov (Quiebre 2° quincena Nov)
      { sucursal: "AV", deposito: "Deposito Norte", fecha: "2025-11-29", cantidad: 5 } // Resto
    ]
  }
];

// Helper to enrich a single product with totals, dates, quiebre categories and breakdowns
export function enrichProduct(raw: RawProduct): Product {
  const ventas = raw.ventas;
  const ventaTotal = ventas.reduce((acc, sale) => acc + sale.cantidad, 0);

  // Find min/max dates
  let fechaPrimeraVenta = "";
  let fechaUltimaVenta = "";
  let vidaUtilDias = 0;

  if (ventas.length > 0) {
    const sortedSales = [...ventas].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    fechaPrimeraVenta = sortedSales[0].fecha;
    fechaUltimaVenta = sortedSales[sortedSales.length - 1].fecha;

    const t1 = new Date(fechaPrimeraVenta).getTime();
    const t2 = new Date(fechaUltimaVenta).getTime();
    vidaUtilDias = Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
  }

  // Calculate Breakdown
  const avVesta = ventas
    .filter(s => s.sucursal === "AV" && s.deposito === "Vesta")
    .reduce((sum, s) => sum + s.cantidad, 0);

  const avSupermercado = ventas
    .filter(s => s.sucursal === "AV" && s.deposito === "Supermercado")
    .reduce((sum, s) => sum + s.cantidad, 0);

  const r20VestaRuta20 = ventas
    .filter(s => s.sucursal === "R20" && (s.deposito === "Vesta Ruta 20" || s.deposito === "Mayorista R20" || s.deposito.toLowerCase().includes("ruta 20") || s.deposito.toLowerCase().includes("vesta ruta 20")))
    .reduce((sum, s) => sum + s.cantidad, 0);

  const totalCategorized = avVesta + avSupermercado + r20VestaRuta20;
  const resto = Math.max(0, ventaTotal - totalCategorized);

  const ventasBreakdown: VentasBreakdown = {
    avVesta,
    avSupermercado,
    r20VestaRuta20: r20VestaRuta20,
    resto
  };

  // Determine Estado de Quiebre
  let estadoQuiebre: Product['estadoQuiebre'] = "OTRO_SIN_QUIEBRE";

  if (fechaUltimaVenta) {
    const lastSaleDate = new Date(fechaUltimaVenta);
    const year = lastSaleDate.getUTCFullYear();
    const month = lastSaleDate.getUTCMonth() + 1; // 1-12
    const day = lastSaleDate.getUTCDate();

    if (year < 2025 || (year === 2025 && month < 11)) {
      estadoQuiebre = "ANTES_NOVIEMBRE";
    } else if (year === 2025 && month === 11) {
      if (day <= 15) {
        estadoQuiebre = "PRIMERA_QUINCENA_NOVIEMBRE";
      } else {
        estadoQuiebre = "SEGUNDA_QUINCENA_NOVIEMBRE";
      }
    } else if (year === 2025 && month === 12 && day >= 1 && day <= 4) {
      estadoQuiebre = "DICIEMBRE_1_A_4";
    } else {
      estadoQuiebre = "OTRO_SIN_QUIEBRE";
    }
  }

  return {
    ...raw,
    ventaTotal,
    fechaPrimeraVenta,
    fechaUltimaVenta,
    vidaUtilDias,
    ventasBreakdown,
    estadoQuiebre
  };
}

export const mockProducts: Product[] = rawProducts.map(enrichProduct);

// Helper to get list of unique suppliers
export const uniqueSuppliers = Array.from(new Set(mockProducts.map(p => p.proveedor))).sort();
