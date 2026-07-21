import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { formatPrice, formatLocalDate } from '../utils';
import { Search, Scan, ArrowRight, AlertTriangle, CheckCircle, HelpCircle, Volume2, Filter } from 'lucide-react';

interface SkuScannerProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export default function SkuScanner({ products, onSelectProduct }: SkuScannerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<string>(() => localStorage.getItem('maestro_quick_supplier') || 'ALL');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync selectedProduct with products list on load/update
  useEffect(() => {
    if (products.length > 0 && (!selectedProduct || !products.some(p => p.codigoProducto === selectedProduct.codigoProducto))) {
      setSelectedProduct(products[0]);
    }
  }, [products]);

  // Sync selectedSupplier to localStorage
  useEffect(() => {
    localStorage.setItem('maestro_quick_supplier', selectedSupplier);
  }, [selectedSupplier]);

  // Unique suppliers list derived dynamically from products state
  const uniqueSuppliers = Array.from(new Set(products.map(p => p.proveedor))).sort();

  // Play a scanner beep sound using Web Audio API (no external asset needed)
  const playBeep = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio Context could not be initialized:", e);
    }
  };

  // Focus search input on mount and keep it active
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Live search as the user types (by Code, Supplier Code, EAN or Description contains)
  useEffect(() => {
    let filtered = products;

    if (selectedSupplier !== 'ALL') {
      filtered = filtered.filter(p => p.proveedor === selectedSupplier);
    }

    if (searchQuery.trim() === '') {
      if (selectedSupplier !== 'ALL') {
        setSearchResults(filtered); // Show all products of selected supplier if filtered
      } else {
        setSearchResults([]);
      }
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const searched = filtered.filter(p => {
      const prodCode = (p.codigoProducto || '').toLowerCase();
      const provCode = (p.codProveedor || '').toLowerCase();
      const eanCode = (p.codigoEan || '').toLowerCase();
      const ultEan = (p.ultimoEan || '').toLowerCase();
      const segEan = (p.segundoEan || '').toLowerCase();
      const desc = (p.descripcion || '').toLowerCase();

      return (
        prodCode.includes(query) ||
        provCode.includes(query) ||
        eanCode.includes(query) ||
        ultEan.includes(query) ||
        segEan.includes(query) ||
        desc.includes(query)
      );
    });

    setSearchResults(searched);
  }, [searchQuery, selectedSupplier, products]);

  // Capture physical keyboard scanner input (EAN codes are entered fast and terminated with 'Enter')
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (searchResults.length > 0) {
        // Match found
        setSelectedProduct(searchResults[0]);
        playBeep('success');
        setSearchQuery('');
      } else {
        // No match found
        playBeep('error');
      }
    }
  };

  // Simulate scanning of pre-defined barcodes
  const handleSimulatedScan = (ean: string) => {
    setSearchQuery(ean);
    const cleanEan = ean.trim().toLowerCase();
    const found = products.find(p => {
      const prodCode = (p.codigoProducto || '').toLowerCase().trim();
      const provCode = (p.codProveedor || '').toLowerCase().trim();
      const eanCode = (p.codigoEan || '').toLowerCase().trim();
      const ultEan = (p.ultimoEan || '').toLowerCase().trim();
      const segEan = (p.segundoEan || '').toLowerCase().trim();
      return prodCode === cleanEan || provCode === cleanEan || eanCode === cleanEan || ultEan === cleanEan || segEan === cleanEan;
    });
    if (found) {
      setSelectedProduct(found);
      playBeep('success');
      setSearchQuery('');
    } else {
      playBeep('error');
    }
  };

  const getQuiebreBadge = (product: Product) => {
    switch (product.estadoQuiebre) {
      case 'ANTES_NOVIEMBRE':
        return {
          text: 'Quebró antes de Noviembre',
          color: 'bg-red-100 text-red-800 border-red-200',
          indicator: 'bg-red-500',
          repo: 'Reposición Muy Alta 🔴'
        };
      case 'PRIMERA_QUINCENA_NOVIEMBRE':
        return {
          text: 'Quebró en 1º Quincena Noviembre',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          indicator: 'bg-orange-500',
          repo: 'Reposición Alta 🟠'
        };
      case 'SEGUNDA_QUINCENA_NOVIEMBRE':
        return {
          text: 'Quebró en 2º Quincena Noviembre',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          indicator: 'bg-amber-400',
          repo: 'Reposición Controlada 🟡'
        };
      case 'DICIEMBRE_1_A_4':
        return {
          text: 'Quebró entre el 1 y 4 de Diciembre',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          indicator: 'bg-blue-500',
          repo: 'Reposición Especial 🔵'
        };
      case 'OTRO_SIN_QUIEBRE':
      default:
        return {
          text: 'Sin Quiebre / Ventas Activas',
          color: 'bg-green-100 text-green-800 border-green-200',
          indicator: 'bg-green-500',
          repo: 'Reposición Base 🟢'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sku-scanner-root">
      
      {/* LEFT SECTION: Search, Controls, Scans (4 cols on large screens) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Real-time search card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4" id="search-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Scan className="w-5 h-5 text-indigo-600" />
              Buscador / Escáner
            </h2>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                soundEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
              title={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {soundEnabled ? 'Sonido: ON' : 'Mudo'}
            </button>
          </div>

          {/* Supplier dropdown filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Filtro por Proveedor</label>
            <div className="relative">
              <select
                value={selectedSupplier}
                onChange={(e) => {
                  setSelectedSupplier(e.target.value);
                  const supplierProds = products.filter(p => p.proveedor === e.target.value);
                  if (e.target.value !== 'ALL' && supplierProds.length > 0) {
                    setSelectedProduct(supplierProds[0]);
                  }
                }}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="ALL">Todos los Proveedores</option>
                {uniqueSuppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">EAN o Cód. Interno</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escanee EAN o digite código..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-900 border border-slate-300 rounded-lg text-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-sans"
                id="sku-search-input"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            💡 <span className="font-semibold text-slate-700">Modo Colector:</span> Puede usar un escáner físico USB/Bluetooth. Presione <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700">Enter</kbd> para forzar la selección rápida.
          </p>
        </div>

        {/* Live Search Results */}
        {(searchQuery || selectedSupplier !== 'ALL') && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm max-h-[350px] overflow-y-auto space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Resultados ({searchResults.length}) {selectedSupplier !== 'ALL' && ` - ${selectedSupplier}`}
            </h3>
            {searchResults.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-sm">No se encontraron productos coincidentes</p>
              </div>
            ) : (
              searchResults.slice(0, 30).map((product) => (
                <button
                  key={product.codigoProducto}
                  onClick={() => {
                    setSelectedProduct(product);
                    playBeep('success');
                    setSearchQuery('');
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                    selectedProduct?.codigoProducto === product.codigoProducto
                      ? 'bg-indigo-50/50 border-indigo-300 text-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-700 transition-colors">
                      {product.descripcion}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                      <span>Cod: <strong className="text-slate-700">{product.codigoProducto}</strong></span>
                      <span>Prov: <strong className="text-slate-700">{product.codProveedor}</strong></span>
                      <span>EAN: <strong className="text-slate-700">{product.ultimoEan}</strong></span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors ml-2 flex-shrink-0" />
                </button>
              ))
            )}
            {searchResults.length > 30 && (
              <p className="text-[10px] text-slate-400 font-mono text-center pt-2 border-t border-slate-100 italic">
                * Mostrando los primeros 30 resultados de {searchResults.length}. Refine el código o descripción para ver más.
              </p>
            )}
          </div>
        )}

        {/* Industrial Tablet Simulation (Demo Shortcuts) */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Simulación del Lector EAN</h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Tablet Demo</span>
          </div>
          <p className="text-xs text-slate-600">
            Pulse un botón para simular la lectura de un código de barras físico en la tablet:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {products.slice(0, 4).map((p) => (
              <button
                key={p.codigoProducto}
                onClick={() => handleSimulatedScan(p.ultimoEan)}
                className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-left text-xs transition-all space-y-1 hover:border-indigo-300"
              >
                <p className="font-bold font-mono text-slate-800 truncate">{p.ultimoEan}</p>
                <p className="text-[10px] text-slate-500 truncate">{p.descCorta}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Legend of Stock Break Reposiciones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Niveles de Reposición (Quiebre de Stock)
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm"></span>
              <div className="flex-1 flex justify-between items-center">
                <span className="font-medium text-slate-700">Reposición Muy Alta</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Quiebre &lt; Nov</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-sm"></span>
              <div className="flex-1 flex justify-between items-center">
                <span className="font-medium text-slate-700">Reposición Alta</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Quiebre 1-15 Nov</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm"></span>
              <div className="flex-1 flex justify-between items-center">
                <span className="font-medium text-slate-700">Reposición Controlada</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Quiebre 16-30 Nov</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-sm"></span>
              <div className="flex-1 flex justify-between items-center">
                <span className="font-medium text-slate-700">Reposición Especial</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Quiebre 1-4 Dic</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-sm"></span>
              <div className="flex-1 flex justify-between items-center">
                <span className="font-medium text-slate-700">Reposición Base</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Venta Continua</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT SECTION: Detailed scanned product display (7 cols on large screens) */}
      <div className="lg:col-span-7">
        {selectedProduct ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="product-detail-card">
            
            {/* Detail Card Header */}
            <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    {selectedProduct.proveedor}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getQuiebreBadge(selectedProduct).color}`}>
                    <span className={`w-2 h-2 rounded-full ${getQuiebreBadge(selectedProduct).indicator}`}></span>
                    {getQuiebreBadge(selectedProduct).text}
                  </div>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug">
                  {selectedProduct.descripcion}
                </h1>
                <p className="text-sm text-slate-400">
                  {selectedProduct.descCorta} • Unidades por bulto: {selectedProduct.unidadesPorBulto}
                </p>
              </div>

              {/* Render photo if present */}
              {selectedProduct.fotoBase64 ? (
                <div className="w-24 h-24 md:w-28 md:h-28 bg-white border border-slate-700 rounded-xl overflow-hidden shadow flex-shrink-0 flex items-center justify-center p-1">
                  <img 
                    src={selectedProduct.fotoBase64} 
                    alt={selectedProduct.descripcion}
                    className="w-full h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : selectedProduct.fotos === 'SI' ? (
                <div className="w-24 h-24 md:w-28 md:h-28 bg-slate-800 border border-slate-700 rounded-xl flex-shrink-0 flex items-center justify-center text-slate-400 font-mono text-[10px] uppercase font-bold text-center p-2">
                  <span>Foto No Importada</span>
                </div>
              ) : null}
            </div>

            {/* Grid stats */}
            <div className="p-6 space-y-6">
              
              {/* Core technical codes & price */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Cód. Interno</span>
                  <p className="text-lg font-bold font-mono text-slate-800 mt-1">{selectedProduct.codigoProducto}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Cód. Proveedor</span>
                  <p className="text-lg font-bold font-mono text-slate-800 mt-1">{selectedProduct.codProveedor}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Último EAN</span>
                  <p className="text-lg font-bold font-mono text-slate-800 mt-1 truncate" title={selectedProduct.ultimoEan}>{selectedProduct.ultimoEan}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                  <span className="text-xs font-bold text-indigo-600 uppercase">Precio Lista</span>
                  <p className="text-xl font-bold font-mono text-indigo-900 mt-1">{formatPrice(selectedProduct.precioLista)}</p>
                </div>
              </div>

              {/* Transaction volumes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4 bg-emerald-50/30">
                  <span className="text-xs font-bold text-slate-500 uppercase">COMPRA TOTAL</span>
                  <p className="text-2xl font-bold text-emerald-800 font-mono mt-1">{selectedProduct.compraTotal} <span className="text-xs font-normal text-slate-500">unid.</span></p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-orange-50/30">
                  <span className="text-xs font-bold text-slate-500 uppercase">VENTA TOTAL</span>
                  <p className="text-2xl font-bold text-orange-800 font-mono mt-1">{selectedProduct.ventaTotal} <span className="text-xs font-normal text-slate-500">unid.</span></p>
                </div>
              </div>

              {/* Lifespan & Dates */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Historial de Fechas de Venta</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700">
                  <div>
                    <span className="text-xs text-slate-500 block">Primera Venta</span>
                    <strong className="font-mono text-sm">{selectedProduct.fechaPrimeraVenta ? formatLocalDate(selectedProduct.fechaPrimeraVenta) : 'Sin registros'}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Última Venta</span>
                    <strong className="font-mono text-sm">{selectedProduct.fechaUltimaVenta ? formatLocalDate(selectedProduct.fechaUltimaVenta) : 'Sin registros'}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Días Transcurridos (Vida Útil)</span>
                    <strong className="text-sm">{selectedProduct.vidaUtilDias} {selectedProduct.vidaUtilDias === 1 ? 'día' : 'días'}</strong>
                  </div>
                </div>
              </div>

              {/* Deposit Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Ventas Discriminadas por Depósito
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Suma: {selectedProduct.ventaTotal} unid.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AV - Vesta */}
                  <div className="border border-slate-100 rounded-lg p-3 bg-white space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">AV - Vesta</span>
                      <span className="font-mono font-semibold text-indigo-700">
                        {selectedProduct.ventasBreakdown.avVesta} u ({selectedProduct.ventaTotal > 0 ? ((selectedProduct.ventasBreakdown.avVesta / selectedProduct.ventaTotal) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${selectedProduct.ventaTotal > 0 ? (selectedProduct.ventasBreakdown.avVesta / selectedProduct.ventaTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* AV - Supermercado */}
                  <div className="border border-slate-100 rounded-lg p-3 bg-white space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">AV - Supermercado</span>
                      <span className="font-mono font-semibold text-sky-700">
                        {selectedProduct.ventasBreakdown.avSupermercado} u ({selectedProduct.ventaTotal > 0 ? ((selectedProduct.ventasBreakdown.avSupermercado / selectedProduct.ventaTotal) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-sky-500 h-full rounded-full"
                        style={{ width: `${selectedProduct.ventaTotal > 0 ? (selectedProduct.ventasBreakdown.avSupermercado / selectedProduct.ventaTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* R20 - Vesta Ruta 20 */}
                  <div className="border border-slate-100 rounded-lg p-3 bg-white space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">R20 - Vesta Ruta 20</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {selectedProduct.ventasBreakdown.r20VestaRuta20} u ({selectedProduct.ventaTotal > 0 ? ((selectedProduct.ventasBreakdown.r20VestaRuta20 / selectedProduct.ventaTotal) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${selectedProduct.ventaTotal > 0 ? (selectedProduct.ventasBreakdown.r20VestaRuta20 / selectedProduct.ventaTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Resto de depósitos */}
                  <div className="border border-slate-100 rounded-lg p-3 bg-white space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">Otros Depósitos</span>
                      <span className="font-mono font-semibold text-amber-700">
                        {selectedProduct.ventasBreakdown.resto} u ({selectedProduct.ventaTotal > 0 ? ((selectedProduct.ventasBreakdown.resto / selectedProduct.ventaTotal) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-400 h-full rounded-full"
                        style={{ width: `${selectedProduct.ventaTotal > 0 ? (selectedProduct.ventasBreakdown.resto / selectedProduct.ventaTotal) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => onSelectProduct(selectedProduct)}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cargar para Reposición
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        ) : (
          <div className="h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <Scan className="w-12 h-12 text-slate-400 mb-3 animate-pulse" />
            <h3 className="font-bold text-slate-700 text-lg">Esperando escaneo</h3>
            <p className="text-sm max-w-xs mt-1">
              Escanee un código de barras con la tablet o digite en el buscador para ver la ficha del maestro SKU.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
