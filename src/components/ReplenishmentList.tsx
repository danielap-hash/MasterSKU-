import React, { useState, useEffect } from 'react';
import { Product, OrderItem, SaleRecord } from '../types';
import { enrichProduct } from '../data/mockProducts';
import { formatPrice } from '../utils';
import { 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Save, 
  Check, 
  RefreshCw, 
  ShoppingCart, 
  Info, 
  Upload, 
  X, 
  FileText, 
  Database, 
  AlertTriangle 
} from 'lucide-react';

interface ReplenishmentListProps {
  products: Product[];
  initialSelectedProduct: Product | null;
  onSaveOrder: (items: OrderItem[]) => void;
  savedQuantities: Record<string, number>;
  onUpdateQuantities: (quantities: Record<string, number>) => void;
  onImportProducts: (imported: Product[]) => void;
  onUpdateImportStatus?: (type: 'GENERAL' | 'COMPRA' | 'VENTA', fileName: string, count: number) => void;
}

type LifespanFilter = 'ALL' | '15_DAYS' | '30_DAYS' | '45_DAYS' | '50_DAYS' | 'MORE_50_DAYS';
type QuiebreFilter = 'ALL' | 'ANTES_NOVIEMBRE' | 'PRIMERA_QUINCENA_NOVIEMBRE' | 'SEGUNDA_QUINCENA_NOVIEMBRE' | 'DICIEMBRE_1_A_4' | 'OTRO_SIN_QUIEBRE';
type ProjectionMonths = 1 | 2 | 3 | 4 | null;
type ProjectionBase = 'COMPRA' | 'VENTA';

export default function ReplenishmentList({
  products,
  initialSelectedProduct,
  onSaveOrder,
  savedQuantities,
  onUpdateQuantities,
  onImportProducts,
  onUpdateImportStatus
}: ReplenishmentListProps) {
  // Filters
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [lifespanFilter, setLifespanFilter] = useState<LifespanFilter>('ALL');
  const [quiebreFilter, setQuiebreFilter] = useState<QuiebreFilter>('ALL');
  const [projectionMonths, setProjectionMonths] = useState<ProjectionMonths>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculation parameters ("Lo calcula el usuario")
  const [projectionBase, setProjectionBase] = useState<ProjectionBase>('COMPRA');
  const [projectionDivisor, setProjectionDivisor] = useState<number>(3); // Default to 3 months (Navidad Season)

  // Order quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // CSV Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [importType, setImportType] = useState<'GENERAL' | 'COMPRA' | 'VENTA'>('GENERAL');
  const [clearExistingCatalog, setClearExistingCatalog] = useState(true);
  const [rawCSVText, setRawCSVText] = useState('');
  const [parsedCSVRows, setParsedCSVRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, number>>({});
  const [delimiter, setDelimiter] = useState(',');
  const [fileName, setFileName] = useState('');
  const [importError, setImportError] = useState('');

  // Unique suppliers list derived dynamically from products state
  const uniqueSuppliers = Array.from(new Set(products.map(p => p.proveedor))).sort();

  // Initialize quantities from parent state or mock values
  useEffect(() => {
    setQuantities(savedQuantities);
  }, [savedQuantities]);

  // Set searchQuery if initialSelectedProduct is passed
  useEffect(() => {
    if (initialSelectedProduct) {
      setSearchQuery(initialSelectedProduct.codigoProducto);
      setSelectedSupplier('ALL');
      setLifespanFilter('ALL');
      setQuiebreFilter('ALL');
    }
  }, [initialSelectedProduct]);

  // Handle quantity change
  const handleQuantityChange = (code: string, val: number) => {
    const updated = { ...quantities, [code]: Math.max(0, val) };
    setQuantities(updated);
    onUpdateQuantities(updated);
  };

  // Helper to calculate stock velocity and projection based on user selection
  const calculateProjection = (product: Product, months: number): number => {
    // Base quantity to project: Compra Total (Default) or Venta Total
    const baseQuantity = projectionBase === 'COMPRA' ? product.compraTotal : product.ventaTotal;
    
    if (baseQuantity === 0) return 0;
    
    // Calculate monthly rate based on the custom user divisor
    const monthlyRate = baseQuantity / Math.max(0.5, projectionDivisor);
    
    // Projected Demand
    const projectedDemand = monthlyRate * months;
    
    // Current physical stock left (Compra - Venta)
    const currentStock = Math.max(0, product.compraTotal - product.ventaTotal);
    
    // Suggested replenishment order
    const suggested = Math.ceil(projectedDemand - currentStock);
    return Math.max(0, suggested);
  };

  // Apply projected quantities to all filtered products
  const handleApplyProjection = (months: ProjectionMonths) => {
    setProjectionMonths(months);
    if (!months) return;

    const newQuantities = { ...quantities };
    getFilteredProducts().forEach(product => {
      const suggested = calculateProjection(product, months);
      newQuantities[product.codigoProducto] = suggested;
    });
    
    setQuantities(newQuantities);
    onUpdateQuantities(newQuantities);
    showToast(`Se proyectó stock de ${months} ${months === 1 ? 'mes' : 'meses'} (Base: ${projectionBase === 'COMPRA' ? 'Comprado' : 'Vendido'}) en la lista filtrada.`, 'info');
  };

  // Clear all quantities in current list
  const handleClearQuantities = () => {
    const newQuantities = { ...quantities };
    getFilteredProducts().forEach(p => {
      newQuantities[p.codigoProducto] = 0;
    });
    setQuantities(newQuantities);
    onUpdateQuantities(newQuantities);
    showToast('Cantidades sugeridas restablecidas a 0', 'info');
  };

  // Show status notification
  const showToast = (text: string, type: 'success' | 'info') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Save current order
  const handleSaveOrder = () => {
    const itemsToSave: OrderItem[] = [];
    products.forEach(p => {
      const qty = quantities[p.codigoProducto] || 0;
      if (qty > 0) {
        itemsToSave.push({
          codigoProducto: p.codigoProducto,
          descripcion: p.descripcion,
          proveedor: p.proveedor,
          codProveedor: p.codProveedor,
          precioLista: p.precioLista,
          cantidadPedir: qty,
          ultimoEan: p.ultimoEan
        });
      }
    });

    if (itemsToSave.length === 0) {
      showToast('Por favor ingrese cantidades a pedir antes de guardar.', 'info');
      return;
    }

    onSaveOrder(itemsToSave);
    showToast(`¡Pedido guardado con éxito! (${itemsToSave.length} productos registrados en Nota de Pedido)`, 'success');
  };

  // Get filtered products
  const getFilteredProducts = (): Product[] => {
    return products.filter(p => {
      // Search Contains filter (EAN, code, supplier code, or description)
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        p.codigoProducto.toLowerCase().includes(q) ||
        p.codProveedor.toLowerCase().includes(q) ||
        p.codigoEan.toLowerCase().includes(q) ||
        p.ultimoEan.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q);

      // Supplier filter
      const matchesSupplier = selectedSupplier === 'ALL' || p.proveedor === selectedSupplier;

      // Lifespan filter
      let matchesLifespan = true;
      if (lifespanFilter === '15_DAYS') {
        matchesLifespan = p.vidaUtilDias <= 15;
      } else if (lifespanFilter === '30_DAYS') {
        matchesLifespan = p.vidaUtilDias > 15 && p.vidaUtilDias <= 30;
      } else if (lifespanFilter === '45_DAYS') {
        matchesLifespan = p.vidaUtilDias > 30 && p.vidaUtilDias <= 45;
      } else if (lifespanFilter === '50_DAYS') {
        matchesLifespan = p.vidaUtilDias > 45 && p.vidaUtilDias <= 50;
      } else if (lifespanFilter === 'MORE_50_DAYS') {
        matchesLifespan = p.vidaUtilDias > 50;
      }

      // Quiebre status filter
      const matchesQuiebre = quiebreFilter === 'ALL' || p.estadoQuiebre === quiebreFilter;

      return matchesSearch && matchesSupplier && matchesLifespan && matchesQuiebre;
    });
  };

  const filteredProducts = getFilteredProducts();

  // CSV Parsing Functions
  const detectDelimiter = (text: string): string => {
    const commaCount = (text.match(/,/g) || []).length;
    const semicolonCount = (text.match(/;/g) || []).length;
    return semicolonCount > commaCount ? ';' : ',';
  };

  const parseCSV = (text: string, delimiterUsed: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; 
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiterUsed && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    
    if (row.length > 0 || currentVal !== '') {
      row.push(currentVal.trim());
      lines.push(row);
    }
    
    return lines;
  };

  // Automatic Synonym Mapping
  const smartMapHeaders = (headers: string[], type: 'GENERAL' | 'COMPRA' | 'VENTA'): Record<string, number> => {
    const mapping: Record<string, number> = {};
    
    const rules: Record<string, string[]> = {
      proveedor: ['proveedor', 'proveed', 'vendor', 'supplier', 'columna a', 'prov', 'contrato'],
      codigoProducto: ['codigo', 'código', 'cod', 'sku', 'product_code', 'interno', 'columna b', 'codigo producto', 'código producto', 'articulo', 'artículo'],
      descripcion: ['descripcion', 'descripción', 'descrip', 'desc', 'nombre', 'detail', 'columna c', 'desc corta', 'desc_corta', 'articulo', 'artículo'],
      codProveedor: ['codproveedor', 'cod_prov', 'codigo proveedor', 'código proveedor', 'columna n', 'cod prov', 'referencia'],
      ultimoEan: ['ean', 'bar_code', 'barcode', 'código ean', 'codigo ean', 'ultimo ean', 'columna q', 'columna s', 'ean13', 'ean 13', 'gln', 'upc'],
      precioLista: ['precio', 'lista', 'costo', 'price', 'precio lista', 'precio de lista', 'columna f', 'precio_lista'],
      compraTotal: ['compra', 'compras', 'compra total', 'compra_total', 'cantidad comprada', 'columna i', 'cantidad_comprada', 'cant_compra', 'ingreso', 'stock'],
      ventaTotal: ['venta', 'ventas', 'venta total', 'venta_total', 'cantidad vendida', 'columna j', 'cantidad_vendida', 'cant_venta', 'egreso', 'salidas'],
      fechaUltimaVenta: ['fecha ultima venta', 'fecha_ultima_venta', 'ultimo dia de venta', 'ultimo dia', 'last sale date', 'fecha_venta', 'fecha_ult_vta', 'ultimo_dia_venta', 'fecha_vta', 'fecha ult vta'],
      sucursal: ['sucursal', 'suc', 'branch', 'columna d', 'punto de venta', 'pdv'],
      deposito: ['deposito', 'depósito', 'dep', 'warehouse', 'columna e', 'almacen', 'almacén']
    };

    Object.entries(rules).forEach(([field, synonyms]) => {
      const idx = headers.findIndex(h => {
        const cleanH = h.toLowerCase().trim();
        return synonyms.some(syn => cleanH === syn || cleanH.includes(syn));
      });
      if (idx !== -1) {
        mapping[field] = idx;
      }
    });
    
    return mapping;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setImportError('El archivo está vacío');
        return;
      }
      processRawCSV(text);
    };
    reader.readAsText(file);
  };

  const processRawCSV = (text: string) => {
    setRawCSVText(text);
    const delim = detectDelimiter(text);
    setDelimiter(delim);

    const rows = parseCSV(text, delim);
    if (rows.length < 2) {
      setImportError('El archivo CSV debe contener al menos una fila de cabecera y una fila de datos.');
      return;
    }

    const headers = rows[0];
    setCsvHeaders(headers);
    setParsedCSVRows(rows.slice(1));
    
    // Auto-map columns with importType context
    const autoMappings = smartMapHeaders(headers, importType);
    setColumnMappings(autoMappings);
    
    setImportStep(2);
  };

  const handleApplyMapping = () => {
    // Validate required fields based on importType
    if (importType === 'GENERAL') {
      if (columnMappings['proveedor'] === undefined || columnMappings['proveedor'] === -1) {
        setImportError('La columna "Proveedor" es obligatoria.');
        return;
      }
      if (columnMappings['codigoProducto'] === undefined || columnMappings['codigoProducto'] === -1) {
        setImportError('La columna "Código Interno" es obligatoria.');
        return;
      }
      if (columnMappings['descripcion'] === undefined || columnMappings['descripcion'] === -1) {
        setImportError('La columna "Descripción" es obligatoria.');
        return;
      }
    } else if (importType === 'COMPRA') {
      if (columnMappings['codigoProducto'] === undefined || columnMappings['codigoProducto'] === -1) {
        setImportError('La columna para identificar el "Código Interno (SKU)" es obligatoria.');
        return;
      }
      if (columnMappings['compraTotal'] === undefined || columnMappings['compraTotal'] === -1) {
        setImportError('La columna "Compra Total" es obligatoria.');
        return;
      }
    } else if (importType === 'VENTA') {
      if (columnMappings['codigoProducto'] === undefined || columnMappings['codigoProducto'] === -1) {
        setImportError('La columna para identificar el "Código Interno (SKU)" es obligatoria.');
        return;
      }
      if (columnMappings['ventaTotal'] === undefined || columnMappings['ventaTotal'] === -1) {
        setImportError('La columna "Venta Total" es obligatoria.');
        return;
      }
    }

    try {
      if (importType === 'GENERAL') {
        const importedProducts: Product[] = parsedCSVRows.map((row) => {
          const getVal = (field: string, fallback: string = ''): string => {
            const colIdx = columnMappings[field];
            if (colIdx !== undefined && colIdx !== -1 && row[colIdx] !== undefined) {
              return row[colIdx];
            }
            return fallback;
          };

          const getNum = (field: string, fallback: number = 0): number => {
            let val = getVal(field).trim();
            if (val.includes('.') && val.includes(',')) {
              if (val.lastIndexOf(',') > val.lastIndexOf('.')) {
                val = val.replace(/\./g, '').replace(/,/g, '.');
              } else {
                val = val.replace(/,/g, '');
              }
            } else if (val.includes(',')) {
              val = val.replace(/,/g, '.');
            }
            const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ''));
            return isNaN(parsed) ? fallback : parsed;
          };

          // Construct Raw Product fields
          const rawItem = {
            proveedor: getVal('proveedor', 'PROVEEDOR IMPORTADO').toUpperCase(),
            codigoProducto: getVal('codigoProducto'),
            descripcion: getVal('descripcion').toUpperCase(),
            descCorta: getVal('descripcion', 'PRODUCTO IMPORTADO').substring(0, 15).toUpperCase(),
            unidadesPorBulto: 1,
            precioLista: getNum('precioLista', 10.0),
            tasaIva: 21,
            impInterno: 0,
            vtaWeb: 'NO',
            fotos: 'NO',
            fraccionVta: 0,
            cadenaDtos: '',
            dtosParticulares: '',
            codProveedor: getVal('codProveedor', getVal('codigoProducto')),
            bloqCompra: 'NO',
            bloqVenta: 'NO',
            codigoEan: getVal('ultimoEan', getVal('codigoProducto')),
            segundoEan: '',
            ultimoEan: getVal('ultimoEan', getVal('codigoProducto')),
            gtin14: '',
            estadoGral: '01 - Pr...',
            cjaXPallet: 48,
            cjasXCam: 120,
            resultado: 'COMPLETADO',
            compraTotal: 0, // General contrato starts with 0 compras
            ventas: [] as any[]
          };

          return enrichProduct(rawItem);
        });

        if (clearExistingCatalog) {
          onImportProducts(importedProducts);
          showToast(`Se importaron ${importedProducts.length} productos del Contrato Proveedor (Catálogo Reemplazado).`, 'success');
          if (onUpdateImportStatus) {
            onUpdateImportStatus('GENERAL', fileName || 'Catalogo.csv', importedProducts.length);
          }
        } else {
          // Merge with existing products
          const merged = [...products];
          let addedCount = 0;
          let updatedCount = 0;

          importedProducts.forEach((newP) => {
            const existingIdx = merged.findIndex(p => p.codigoProducto === newP.codigoProducto);
            if (existingIdx !== -1) {
              merged[existingIdx] = {
                ...merged[existingIdx],
                proveedor: newP.proveedor,
                descripcion: newP.descripcion,
                descCorta: newP.descCorta,
                precioLista: newP.precioLista,
                codProveedor: newP.codProveedor,
                codigoEan: newP.codigoEan,
                ultimoEan: newP.ultimoEan,
              };
              updatedCount++;
            } else {
              merged.push(newP);
              addedCount++;
            }
          });

          onImportProducts(merged);
          showToast(`Contrato Proveedor importado: ${addedCount} nuevos agregados, ${updatedCount} actualizados.`, 'success');
          if (onUpdateImportStatus) {
            onUpdateImportStatus('GENERAL', fileName || 'Catalogo.csv', merged.length);
          }
        }

      } else if (importType === 'COMPRA') {
        let updatedCount = 0;
        let skippedCount = 0;
        const merged = [...products];

        parsedCSVRows.forEach((row) => {
          const skuCol = columnMappings['codigoProducto'];
          const qtyCol = columnMappings['compraTotal'];
          if (skuCol === undefined || qtyCol === undefined || row[skuCol] === undefined || row[qtyCol] === undefined) {
            return;
          }

          const sku = row[skuCol].trim();
          const qtyStr = row[qtyCol].replace(/[^0-9.-]+/g, '');
          const qty = parseInt(qtyStr) || 0;

          const cleanSku = sku.trim().toLowerCase();
          const existingIdx = merged.findIndex(p => {
            const prodCode = (p.codigoProducto || '').trim().toLowerCase();
            const provCode = (p.codProveedor || '').trim().toLowerCase();
            const eanCode = (p.codigoEan || '').trim().toLowerCase();
            const ultEan = (p.ultimoEan || '').trim().toLowerCase();
            const segEan = (p.segundoEan || '').trim().toLowerCase();
            return prodCode === cleanSku || provCode === cleanSku || eanCode === cleanSku || ultEan === cleanSku || segEan === cleanSku;
          });
          if (existingIdx !== -1) {
            merged[existingIdx] = {
              ...merged[existingIdx],
              compraTotal: qty
            };

            merged[existingIdx] = enrichProduct(merged[existingIdx]);
            updatedCount++;
          } else {
            skippedCount++;
          }
        });

        onImportProducts(merged);
        showToast(`Planilla de Compra importada: ${updatedCount} productos actualizados (${skippedCount} SKUs no encontrados).`, 'success');
        if (onUpdateImportStatus) {
          onUpdateImportStatus('COMPRA', fileName || 'Compras.csv', updatedCount);
        }

      } else if (importType === 'VENTA') {
        let updatedCount = 0;
        let skippedCount = 0;
        const merged = [...products];

        // Group sales records by SKU first, to accumulate multiple rows for the same SKU if present
        const salesBySku: Record<string, SaleRecord[]> = {};

        parsedCSVRows.forEach((row) => {
          const skuCol = columnMappings['codigoProducto'];
          const qtyCol = columnMappings['ventaTotal'];
          const dateCol = columnMappings['fechaUltimaVenta'];
          const sucCol = columnMappings['sucursal'];
          const depCol = columnMappings['deposito'];

          if (skuCol === undefined || qtyCol === undefined || row[skuCol] === undefined || row[qtyCol] === undefined) {
            return;
          }

          const sku = row[skuCol].trim();
          if (!sku) return;

          const qtyStr = row[qtyCol].replace(/[^0-9.-]+/g, '');
          const qty = parseInt(qtyStr) || 0;

          let lastSaleDateStr = '2025-11-20'; // default fallback
          if (dateCol !== undefined && dateCol !== -1 && row[dateCol] !== undefined && row[dateCol].trim() !== '') {
            const rawDate = row[dateCol].trim();
            if (rawDate.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
              const parts = rawDate.split(/[\/\-]/);
              lastSaleDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (rawDate.match(/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/)) {
              lastSaleDateStr = rawDate.replace(/\//g, '-');
            } else {
              lastSaleDateStr = rawDate;
            }
          }

          let sucursalVal = 'AV';
          if (sucCol !== undefined && sucCol !== -1 && row[sucCol] !== undefined && row[sucCol].trim() !== '') {
            sucursalVal = row[sucCol].trim();
          }

          let depositoVal = 'Vesta';
          if (depCol !== undefined && depCol !== -1 && row[depCol] !== undefined && row[depCol].trim() !== '') {
            depositoVal = row[depCol].trim();
          }

          if (!salesBySku[sku]) {
            salesBySku[sku] = [];
          }

          salesBySku[sku].push({
            sucursal: sucursalVal,
            deposito: depositoVal,
            fecha: lastSaleDateStr,
            cantidad: qty
          });
        });

        // Apply matched sales
        Object.entries(salesBySku).forEach(([sku, records]) => {
          const cleanSku = sku.trim().toLowerCase();
          const existingIdx = merged.findIndex(p => {
            const prodCode = (p.codigoProducto || '').trim().toLowerCase();
            const provCode = (p.codProveedor || '').trim().toLowerCase();
            const eanCode = (p.codigoEan || '').trim().toLowerCase();
            const ultEan = (p.ultimoEan || '').trim().toLowerCase();
            const segEan = (p.segundoEan || '').trim().toLowerCase();
            return prodCode === cleanSku || provCode === cleanSku || eanCode === cleanSku || ultEan === cleanSku || segEan === cleanSku;
          });
          if (existingIdx !== -1) {
            const totalQty = records.reduce((sum, r) => sum + r.cantidad, 0);
            
            const positiveRecords = records.filter(r => r.cantidad > 0);
            let latestDate = '';
            if (positiveRecords.length > 0) {
              const sorted = [...positiveRecords].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
              latestDate = sorted[0].fecha;
            } else if (records.length > 0) {
              const sorted = [...records].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
              latestDate = sorted[0].fecha;
            }

            merged[existingIdx] = {
              ...merged[existingIdx],
              ventaTotal: totalQty,
              fechaUltimaVenta: latestDate || '2025-11-20',
              ventas: records
            };

            merged[existingIdx] = enrichProduct(merged[existingIdx]);
            updatedCount++;
          } else {
            skippedCount++;
          }
        });

        onImportProducts(merged);
        showToast(`Planilla de Venta importada: ${updatedCount} productos actualizados (${skippedCount} SKUs no encontrados y recalculo de quiebre realizado).`, 'success');
        if (onUpdateImportStatus) {
          onUpdateImportStatus('VENTA', fileName || 'Ventas.csv', updatedCount);
        }
      }

      setIsImportOpen(false);
      resetImportState();
    } catch (err) {
      console.error(err);
      setImportError('Error procesando las filas del archivo. Verifique el mapeo e intente nuevamente.');
    }
  };

  const resetImportState = () => {
    setImportStep(1);
    setRawCSVText('');
    setParsedCSVRows([]);
    setCsvHeaders([]);
    setColumnMappings({});
    setFileName('');
    setImportError('');
  };

  const getQuiebreBadgeStyle = (product: Product) => {
    switch (product.estadoQuiebre) {
      case 'ANTES_NOVIEMBRE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'PRIMERA_QUINCENA_NOVIEMBRE':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'SEGUNDA_QUINCENA_NOVIEMBRE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DICIEMBRE_1_A_4':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OTRO_SIN_QUIEBRE':
      default:
        return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  const getQuiebreLabel = (status: Product['estadoQuiebre']) => {
    switch (status) {
      case 'ANTES_NOVIEMBRE': return 'Quebró < Noviembre 🔴';
      case 'PRIMERA_QUINCENA_NOVIEMBRE': return 'Quebró 1º Quincena Nov 🟠';
      case 'SEGUNDA_QUINCENA_NOVIEMBRE': return 'Quebró 2º Quincena Nov 🟡';
      case 'DICIEMBRE_1_A_4': return 'Quebró 1-4 Dic 🔵';
      case 'OTRO_SIN_QUIEBRE':
      default:
        return 'Venta Activa / Sin Quiebre 🟢';
    }
  };

  return (
    <div className="space-y-6" id="replenishment-root">
      
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border animate-bounce flex items-center gap-3 text-sm font-semibold max-w-md ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          {notification.type === 'success' ? <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* FILTER & CRITERIA BAR CARD */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            Filtros de Abastecimiento & Proyecciones Inteligentes
          </h2>
          
          {/* IMPORT EXCEL / CSV BUTTON */}
          <button
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors focus:outline-none shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importar Excel / CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Supplier Dropdown Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Proveedor</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2.5 px-3 text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              id="supplier-filter-select"
            >
              <option value="ALL">Todos los Proveedores</option>
              {uniqueSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Quiebre State Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Estado "Quebraron" (Última Venta)</label>
            <select
              value={quiebreFilter}
              onChange={(e) => setQuiebreFilter(e.target.value as QuiebreFilter)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2.5 px-3 text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              id="quiebre-filter-select"
            >
              <option value="ALL">Todos los Quiebres</option>
              <option value="ANTES_NOVIEMBRE">Quebró antes de Noviembre</option>
              <option value="PRIMERA_QUINCENA_NOVIEMBRE">Quebró 1º Quincena Nov</option>
              <option value="SEGUNDA_QUINCENA_NOVIEMBRE">Quebró 2º Quincena Nov</option>
              <option value="DICIEMBRE_1_A_4">Quebró entre 1 y 4 de Diciembre</option>
              <option value="OTRO_SIN_QUIEBRE">Sin Quiebre / Venta Activa</option>
            </select>
          </div>

          {/* Quick Contains Search */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Búsqueda rápida en lista</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="EAN, Código o descripción..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                id="replenishment-search-input"
              />
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 -translate-y-1" />
            </div>
          </div>

          {/* Projected Months Stock buttons */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase block">Proyectar Meses de Stock</label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map(m => (
                <button
                  key={m}
                  onClick={() => handleApplyProjection(m as ProjectionMonths)}
                  className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                    projectionMonths === m
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                  title={`Proyectar ${m} ${m === 1 ? 'mes' : 'meses'} de stock`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* CUSTOM PROJECTION FORMULA CALCULATOR ("Lo calcula el usuario") */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Configuración de la Proyección (Cálculo Ajustable por el Usuario)
            </h3>
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
              Fórmula: Sugerido = (Base / {projectionDivisor} {projectionDivisor === 1 ? 'mes' : 'meses'}) * Meses Proyectados - Stock Actual
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Projection Base Radio */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 block">1. Proyectar sobre la Base de:</span>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="projectionBase"
                    checked={projectionBase === 'COMPRA'}
                    onChange={() => {
                      setProjectionBase('COMPRA');
                      setProjectionMonths(null);
                    }}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Cantidad Comprada (Compra Total)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="projectionBase"
                    checked={projectionBase === 'VENTA'}
                    onChange={() => {
                      setProjectionBase('VENTA');
                      setProjectionMonths(null);
                    }}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>Cantidad Vendida (Venta Total)</span>
                </label>
              </div>
            </div>

            {/* Reference Period Divisor Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 block">2. La cantidad base representa un período de:</span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 6].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setProjectionDivisor(val);
                      setProjectionMonths(null);
                    }}
                    className={`px-3 py-1 text-xs font-bold border rounded-lg transition-all ${
                      projectionDivisor === val
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {val} {val === 1 ? 'Mes' : 'Meses'} {val === 3 ? '(Temporada)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Global Controls & Active Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {projectionMonths && (
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 text-amber-600" />
                Sugerencias recalculadas para {projectionMonths} {projectionMonths === 1 ? 'mes' : 'meses'} de stock (Base: {projectionBase === 'COMPRA' ? 'Comprado' : 'Vendido'})
                <button 
                  onClick={() => { setProjectionMonths(null); handleClearQuantities(); }} 
                  className="ml-1 text-amber-500 hover:text-amber-700 font-bold text-xs"
                >
                  ×
                </button>
              </span>
            )}
            {selectedSupplier !== 'ALL' && (
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                Filtrando: {selectedSupplier}
              </span>
            )}
            {quiebreFilter !== 'ALL' && (
              <span className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                {getQuiebreLabel(quiebreFilter)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSupplier('ALL');
                setLifespanFilter('ALL');
                setQuiebreFilter('ALL');
                setSearchQuery('');
                setProjectionMonths(null);
                setProjectionBase('COMPRA');
                setProjectionDivisor(3);
                handleClearQuantities();
              }}
              className="px-3.5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors focus:outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restablecer
            </button>
            <button
              onClick={handleSaveOrder}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm focus:outline-none"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar Pedido Completo
            </button>
          </div>
        </div>

      </div>

      {/* REPLENISHMENT PRODUCTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="replenishment-table-card">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <span className="text-sm font-bold uppercase tracking-wider">
            Listado Armado para Compras ({filteredProducts.length} productos)
          </span>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full font-semibold border border-slate-700">
            Página de Reposición
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-lg">No se encontraron productos</h3>
            <p className="text-sm mt-1">Cambie los filtros o el término de búsqueda para ver resultados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[160px]">Proveedor</th>
                  <th className="py-3.5 px-4 w-[110px]">Códigos (Int/Prov)</th>
                  <th className="py-3.5 px-4 w-[120px]">EAN</th>
                  <th className="py-3.5 px-4">Descripción del Producto</th>
                  <th className="py-3.5 px-4 w-[180px]">Quiebre / Historial Ventas</th>
                  <th className="py-3.5 px-4 w-[90px] text-right">P. Lista</th>
                  <th className="py-3.5 px-4 w-[80px] text-right">Compra</th>
                  <th className="py-3.5 px-4 w-[80px] text-right">Venta</th>
                  <th className="py-3.5 px-4 w-[100px] text-center">Vida Útil</th>
                  <th className="py-3.5 px-4 w-[120px] text-center">% Compra - Venta</th>
                  <th className="py-3.5 px-4 w-[130px] text-center bg-indigo-50/50">A Pedir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {filteredProducts.map((p) => {
                  const percentVC = p.compraTotal > 0 ? (p.ventaTotal / p.compraTotal) * 100 : 0;
                  const qtyToOrder = quantities[p.codigoProducto] || 0;
                  
                  // Calculate dynamic prediction for display in cell tooltip or helper text
                  const oneMonthProjection = calculateProjection(p, 1);
                  const activeProjection = projectionMonths ? calculateProjection(p, projectionMonths) : 0;

                  return (
                    <tr 
                      key={p.codigoProducto} 
                      className={`hover:bg-slate-50/80 transition-colors ${qtyToOrder > 0 ? 'bg-indigo-50/15' : ''}`}
                    >
                      {/* Proveedor */}
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800 line-clamp-1 text-xs" title={p.proveedor}>
                          {p.proveedor}
                        </span>
                      </td>

                      {/* Códigos */}
                      <td className="py-4 px-4 font-mono text-xs space-y-0.5">
                        <div className="text-slate-900">Int: <strong>{p.codigoProducto}</strong></div>
                        <div className="text-slate-500">Prov: {p.codProveedor}</div>
                      </td>

                      {/* EAN */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        {p.ultimoEan}
                      </td>

                      {/* Descripción */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 text-sm line-clamp-2" title={p.descripcion}>
                          {p.descripcion}
                        </div>
                      </td>

                      {/* Estado Quiebre & Historial de Ventas */}
                      <td className="py-4 px-4 space-y-1">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${getQuiebreBadgeStyle(p)}`}>
                          {getQuiebreLabel(p.estadoQuiebre).replace(' 🔴', '').replace(' 🟠', '').replace(' 🟡', '').replace(' 🔵', '').replace(' 🟢', '')}
                        </span>
                        <div className="text-[10px] text-slate-500 space-y-0.5 font-mono">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">1ra Venta:</span> 
                            <span className="font-semibold text-slate-700">{p.fechaPrimeraVenta ? new Date(p.fechaPrimeraVenta).toLocaleDateString('es-AR') : 'S/D'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Últ Venta:</span> 
                            <span className="font-semibold text-slate-700">{p.fechaUltimaVenta ? new Date(p.fechaUltimaVenta).toLocaleDateString('es-AR') : 'S/D'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Precio de Lista */}
                      <td className="py-4 px-4 text-right font-mono font-medium text-slate-900">
                        {formatPrice(p.precioLista)}
                      </td>

                      {/* Compra */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-emerald-800">
                        {p.compraTotal}
                      </td>

                      {/* Venta */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-orange-800">
                        {p.ventaTotal}
                      </td>

                      {/* Vida Útil (Días) */}
                      <td className="py-4 px-4 text-center font-medium font-mono text-xs text-slate-700">
                        {p.fechaPrimeraVenta ? (
                          <span>{p.vidaUtilDias} {p.vidaUtilDias === 1 ? 'día' : 'días'}</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin Ventas</span>
                        )}
                      </td>

                      {/* % Compra - Venta */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold font-mono ${
                          percentVC >= 90 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : percentVC >= 50 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {percentVC.toFixed(1)}%
                        </span>
                      </td>

                      {/* Cantidad a pedir Input Box */}
                      <td className="py-4 px-4 text-center bg-indigo-50/20">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={qtyToOrder || ''}
                              onChange={(e) => handleQuantityChange(p.codigoProducto, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-16 py-1 px-1.5 text-center font-bold text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-900 shadow-sm"
                            />
                            {qtyToOrder > 0 && (
                              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs" title="Agregado al pedido">
                                ✓
                              </span>
                            )}
                          </div>
                          {projectionMonths ? (
                            <span className="text-[10px] text-indigo-700 font-bold">
                              Sugerido: {activeProjection} u
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500">
                              Sugerido 1M: {oneMonthProjection} u
                            </span>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Global summary count */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center text-slate-600 text-sm">
          <div>
            Mostrando <strong>{filteredProducts.length}</strong> de <strong>{products.length}</strong> productos en total
          </div>
          <div className="flex gap-4 font-semibold text-slate-800">
            <span>Total Compra: {filteredProducts.reduce((s, p) => s + p.compraTotal, 0)} u</span>
            <span>Total Venta: {filteredProducts.reduce((s, p) => s + p.ventaTotal, 0)} u</span>
            <span className="text-indigo-700">Items Seleccionados para Pedir: {Object.values(quantities).filter((q): q is number => typeof q === 'number' && q > 0).length}</span>
          </div>
        </div>

      </div>

      {/* CSV IMPORT WIZARD MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-lg">Asistente de Importación de Datos Reales</h3>
                  <p className="text-xs text-slate-400">Cargue sus planillas (General, Compra o Venta) para mantener sincronizado su maestro SKU</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsImportOpen(false); resetImportState(); }}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 pb-2">
                <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${importStep === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <span>1. Seleccionar Planilla</span>
                </div>
                <div className="w-8 h-0.5 bg-slate-200" />
                <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${importStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <span>2. Mapear Columnas</span>
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {/* STEP 1: SELECT PLANILLA & FILE */}
              {importStep === 1 && (
                <div className="space-y-4">
                  {/* Planilla type selection tabs */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Seleccione la planilla que desea cargar:</label>
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-1 grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => { setImportType('GENERAL'); setImportError(''); }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          importType === 'GENERAL'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        1. General (Contrato)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImportType('COMPRA'); setImportError(''); }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          importType === 'COMPRA'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        2. Compra
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImportType('VENTA'); setImportError(''); }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          importType === 'VENTA'
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        3. Venta
                      </button>
                    </div>
                  </div>

                  {/* Specific instructions for selected planilla */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
                    {importType === 'GENERAL' && (
                      <>
                        <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-indigo-600" />
                          Planilla 1: General (Contrato Proveedor)
                        </h4>
                        <p>
                          Carga el listado de productos, SKU interno, descripción, EAN y costos. Inicializa o agrega al catálogo actual.
                        </p>
                        <div className="flex items-center gap-4 mt-2 bg-white/80 border border-indigo-50 p-2 rounded-lg">
                          <label className="font-bold text-slate-600 text-[10px] uppercase">Modo Catálogo:</label>
                          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-800">
                            <input
                              type="radio"
                              name="catalogMode"
                              checked={clearExistingCatalog === true}
                              onChange={() => setClearExistingCatalog(true)}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            Reemplazar Todo
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-800">
                            <input
                              type="radio"
                              name="catalogMode"
                              checked={clearExistingCatalog === false}
                              onChange={() => setClearExistingCatalog(false)}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            Agregar / Actualizar Existentes
                          </label>
                        </div>
                      </>
                    )}
                    {importType === 'COMPRA' && (
                      <>
                        <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-indigo-600" />
                          Planilla 2: Planilla de Compras Totales
                        </h4>
                        <p>
                          Actualiza las cantidades compradas históricas buscando por Código Interno (SKU) o Código de Barras en los artículos ya cargados.
                        </p>
                      </>
                    )}
                    {importType === 'VENTA' && (
                      <>
                        <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                          <ShoppingCart className="w-4 h-4 text-indigo-600" />
                          Planilla 3: Planilla de Ventas Totales y Quiebre
                        </h4>
                        <p>
                          Actualiza las cantidades vendidas e introduce la fecha del último día de venta para recalcular cuándo se quebró el stock ("Estado Quiebre").
                        </p>
                      </>
                    )}
                  </div>

                  {/* Drag and drop block */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 rounded-2xl p-8 text-center transition-colors relative cursor-pointer group">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-12 h-12 text-slate-400 group-hover:text-indigo-500 mx-auto mb-3 transition-colors" />
                    <h4 className="font-bold text-slate-700 text-sm">Seleccione o arrastre su archivo .CSV de Excel</h4>
                    <p className="text-xs text-slate-500 mt-1">Formatos UTF-8 con columnas separadas por comas o punto y coma</p>
                    <span className="inline-block mt-4 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full group-hover:bg-indigo-100">
                      Examinar archivos
                    </span>
                  </div>

                  {/* Manual paste alternative */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">O pegue el contenido CSV directamente aquí:</label>
                    <textarea
                      value={rawCSVText}
                      onChange={(e) => setRawCSVText(e.target.value)}
                      placeholder={
                        importType === 'GENERAL'
                          ? "Proveedor;Codigo SKU;Descripcion;PrecioLista;EAN\nVESTA S.A.;9012714;BOLA AGUA CELESTE;18.83;3890541800002"
                          : importType === 'COMPRA'
                          ? "Codigo SKU;Compras Totales\n9012714;120\n9021126;450"
                          : "Codigo SKU;Ventas Totales;Fecha Ultima Venta\n9012714;95;2025-11-28\n9021126;430;2025-11-12"
                      }
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      disabled={!rawCSVText.trim()}
                      onClick={() => processRawCSV(rawCSVText)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                      Procesar Texto Pegado
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: MAP COLUMNS */}
              {importStep === 2 && (
                <div className="space-y-5">
                  <div className="bg-slate-50 p-3 rounded-lg text-xs flex justify-between items-center border border-slate-200">
                    <div>
                      <span>Archivo: <strong>{fileName || 'Texto pegado'}</strong></span>
                      <span className="mx-2 text-slate-400">|</span>
                      <span>Planilla: <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold uppercase">{importType}</strong></span>
                      <span className="mx-2 text-slate-400">|</span>
                      <span>Separador: <strong className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">{delimiter === ';' ? 'Punto y Coma (;)' : 'Comma (,)'}</strong></span>
                    </div>
                    <button 
                      onClick={resetImportState}
                      className="text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      Cambiar archivo
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Asocie los campos requeridos del maestro SKU con las columnas detectadas de su planilla CSV:
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                          <th className="py-2.5 px-4">Campo de la App</th>
                          <th className="py-2.5 px-4 w-[280px]">Columna en su CSV</th>
                          <th className="py-2.5 px-4 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {/* Map table fields depending on active importType */}
                        {[
                          // General fields
                          importType === 'GENERAL' && { key: 'proveedor', label: 'Proveedor / Contrato', req: true },
                          importType === 'GENERAL' && { key: 'codigoProducto', label: 'Código Interno (SKU)', req: true },
                          importType === 'GENERAL' && { key: 'descripcion', label: 'Descripción / Nombre', req: true },
                          importType === 'GENERAL' && { key: 'codProveedor', label: 'Código de Proveedor (Opcional)', req: false },
                          importType === 'GENERAL' && { key: 'ultimoEan', label: 'Código EAN / Barras (Opcional)', req: false },
                          importType === 'GENERAL' && { key: 'precioLista', label: 'Precio de Lista / Costo (Opcional)', req: false },
                          
                          // Compra fields
                          importType === 'COMPRA' && { key: 'codigoProducto', label: 'Código SKU / EAN (Identificador)', req: true },
                          importType === 'COMPRA' && { key: 'compraTotal', label: 'Cantidad Comprada (Compra Total)', req: true },
                          
                          // Venta fields
                          importType === 'VENTA' && { key: 'codigoProducto', label: 'Código SKU / EAN (Identificador)', req: true },
                          importType === 'VENTA' && { key: 'ventaTotal', label: 'Cantidad Vendida (Venta Total)', req: true },
                          importType === 'VENTA' && { key: 'fechaUltimaVenta', label: 'Última Fecha de Venta (AAAA-MM-DD)', req: false },
                          importType === 'VENTA' && { key: 'sucursal', label: 'Sucursal (Opcional)', req: false },
                          importType === 'VENTA' && { key: 'deposito', label: 'Depósito (Opcional)', req: false },
                        ]
                          .filter((field): field is { key: string; label: string; req: boolean } => !!field)
                          .map((field) => {
                            const currentMappedIdx = columnMappings[field.key] !== undefined ? columnMappings[field.key] : -1;
                            
                            return (
                              <tr key={field.key} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-4 font-semibold">
                                  {field.label} {field.req && <span className="text-rose-500">*</span>}
                                </td>
                                <td className="py-2.5 px-4">
                                  <select
                                    value={currentMappedIdx}
                                    onChange={(e) => {
                                      setColumnMappings({
                                        ...columnMappings,
                                        [field.key]: parseInt(e.target.value)
                                      });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                                  >
                                    <option value={-1}>-- No importar (omitir) --</option>
                                    {csvHeaders.map((header, idx) => (
                                      <option key={idx} value={idx}>
                                        Col {idx + 1}: {header}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {currentMappedIdx !== -1 ? (
                                    <span className="text-emerald-600 font-bold">Asociado ✓</span>
                                  ) : field.req ? (
                                    <span className="text-rose-600 font-bold">Faltante ⚠</span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">Omitido</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pre-visualization preview */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-700">Vista Previa de Datos Mapeados (Primeras 2 filas):</h5>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-[10px] text-slate-600 overflow-x-auto">
                      {parsedCSVRows.slice(0, 2).map((row, rowIdx) => (
                        <div key={rowIdx} className="border-b border-slate-200 last:border-0 py-1 space-y-0.5">
                          <div><strong>Fila {rowIdx + 1}:</strong></div>
                          <div className="grid grid-cols-2 gap-x-4 pl-3">
                            {importType === 'GENERAL' ? (
                              <>
                                <div>Proveedor: <span className="text-indigo-600 font-bold">{row[columnMappings['proveedor']] || '--'}</span></div>
                                <div>Código: <span className="text-indigo-600 font-bold">{row[columnMappings['codigoProducto']] || '--'}</span></div>
                                <div className="col-span-2">Descripción: <span className="text-indigo-600 font-bold">{row[columnMappings['descripcion']] || '--'}</span></div>
                                <div>EAN: <span className="text-indigo-600">{row[columnMappings['ultimoEan']] || '--'}</span></div>
                                <div>Costo: <span className="text-indigo-600">
                                  {(() => {
                                    const rawVal = row[columnMappings['precioLista']];
                                    if (!rawVal) return '--';
                                    const parsed = parseFloat(rawVal.toString().replace(/,/g, '.').replace(/[^0-9.-]+/g, ''));
                                    return isNaN(parsed) ? rawVal : formatPrice(parsed);
                                  })()}
                                </span></div>
                              </>
                            ) : importType === 'COMPRA' ? (
                              <>
                                <div>Código Identificar: <span className="text-indigo-600 font-bold">{row[columnMappings['codigoProducto']] || '--'}</span></div>
                                <div>Compra Total: <span className="text-indigo-600 font-bold">{row[columnMappings['compraTotal']] || '0'} u</span></div>
                              </>
                            ) : (
                              <>
                                <div>Código Identificar: <span className="text-indigo-600 font-bold">{row[columnMappings['codigoProducto']] || '--'}</span></div>
                                <div>Venta Total: <span className="text-indigo-600 font-bold">{row[columnMappings['ventaTotal']] || '0'} u</span></div>
                                <div>Sucursal: <span className="text-indigo-600">{columnMappings['sucursal'] !== undefined && columnMappings['sucursal'] !== -1 ? row[columnMappings['sucursal']] : 'AV'}</span></div>
                                <div>Depósito: <span className="text-indigo-600 font-bold">{columnMappings['deposito'] !== undefined && columnMappings['deposito'] !== -1 ? row[columnMappings['deposito']] : 'Vesta'}</span></div>
                                <div className="col-span-2">Fecha Últ. Venta: <span className="text-indigo-600">{row[columnMappings['fechaUltimaVenta']] || '2025-11-20'}</span></div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => { setIsImportOpen(false); resetImportState(); }}
                className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg focus:outline-none"
              >
                Cancelar
              </button>
              
              {importStep === 2 && (
                <button
                  onClick={handleApplyMapping}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm focus:outline-none flex items-center gap-1.5 font-extrabold"
                >
                  <Check className="w-4 h-4" />
                  Confirmar e Importar ({parsedCSVRows.length} filas)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
