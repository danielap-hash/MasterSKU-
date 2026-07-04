import React, { useState, useRef, useEffect } from 'react';
import { Product, SaleRecord } from '../types';
import { enrichProduct } from '../data/mockProducts';
import { formatPrice } from '../utils';
import { 
  PlusCircle, 
  Database, 
  FileCheck, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Upload, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  FileCode,
  Package,
  Calendar,
  Sparkles
} from 'lucide-react';

export interface ImportFileInfo {
  loaded: boolean;
  fileName: string;
  date: string;
  count: number;
}

export interface ImportStatus {
  general: ImportFileInfo;
  compra: ImportFileInfo;
  venta: ImportFileInfo;
}

interface NewProductManagerProps {
  products: Product[];
  newManualProducts: Product[];
  onAddProduct: (product: Product) => void;
  onClearNewManualProducts: () => void;
  onDeleteIndividualProduct: (codigoProducto: string) => void;
  importStatus: ImportStatus;
  onResetToDemo: () => void;
}

export default function NewProductManager({
  products,
  newManualProducts = [],
  onAddProduct,
  onClearNewManualProducts,
  onDeleteIndividualProduct,
  importStatus,
  onResetToDemo
}: NewProductManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const exportManualProductsToCSV = () => {
    if (newManualProducts.length === 0) {
      showToast("No hay productos nuevos para exportar", "error");
      return;
    }

    const headers = [
      "Proveedor",
      "Codigo Proveedor",
      "SKU / Codigo Interno",
      "Descripcion",
      "Codigo Barras EAN",
      "Precio Lista",
      "Stock Inicial"
    ];

    const rows = newManualProducts.map(p => [
      `"${p.proveedor.replace(/"/g, '""')}"`,
      `"${p.codProveedor.replace(/"/g, '""')}"`,
      `"${p.codigoProducto.replace(/"/g, '""')}"`,
      `"${p.descripcion.replace(/"/g, '""')}"`,
      `"${p.ultimoEan.replace(/"/g, '""')}"`,
      p.precioLista.toString().replace('.', ','),
      p.compraTotal.toString()
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `productos_nuevos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Se exportó la lista con ${newManualProducts.length} productos nuevos.`, "success");
  };

  // Form states
  const [proveedorSelect, setProveedorSelect] = useState('VESTA IMPORT S.A.');
  const [proveedorCustom, setProveedorCustom] = useState('');
  const [codProveedor, setCodProveedor] = useState('');
  const [sku, setSku] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ean, setEan] = useState('');
  const [precioLista, setPrecioLista] = useState('');
  const [stock, setStock] = useState('100');
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);

  // Camera capture states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-generate unique SKU when opening the modal
  const openModal = () => {
    // Generate Sku: find max number-like SKU and add 1
    const numericSkus = products
      .map(p => parseInt(p.codigoProducto))
      .filter(num => !isNaN(num) && num > 9000000);
    const nextSkuNum = numericSkus.length > 0 ? Math.max(...numericSkus) + 1 : 9024361;
    
    setSku(nextSkuNum.toString());
    setEan(nextSkuNum.toString()); // EAN equals SKU by default
    setProveedorSelect('VESTA IMPORT S.A.');
    setProveedorCustom('');
    setCodProveedor('');
    setDescripcion('');
    setPrecioLista('');
    setStock('100');
    setFotoBase64(null);
    setIsModalOpen(true);
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Close camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start camera stream
  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("La cámara no está disponible en este navegador o entorno iFrame. Por favor use la opción 'Importar Foto' para subir un archivo.", "error");
      return;
    }

    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Back camera if available
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("No se pudo acceder a la cámara:", err);
      let errorMsg = "No se pudo iniciar la cámara. Verifique los permisos o suba un archivo.";
      
      const errorName = err?.name || '';
      const errorMessage = err?.message || '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorMessage.includes('dismissed') || errorMessage.includes('denied')) {
        errorMsg = "Permiso de cámara rechazado. Habilite la cámara en su navegador o use 'Importar Foto'.";
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        errorMsg = "No se encontró ninguna cámara activa en este dispositivo.";
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        errorMsg = "La cámara está siendo usada por otra aplicación o pestaña.";
      }

      showToast(errorMsg, "error");
      setIsCameraActive(false);
    }
  };

  // Capture frame from camera stream
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFotoBase64(dataUrl);
        stopCamera();
        showToast("Foto capturada con éxito", "success");
      }
    }
  };

  // Handle uploaded photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFotoBase64(reader.result as string);
        showToast("Foto cargada con éxito", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const finalProveedor = proveedorSelect === 'OTRO' ? proveedorCustom.trim().toUpperCase() : proveedorSelect;
    if (!finalProveedor) {
      showToast("Por favor especifique el Proveedor", "error");
      return;
    }
    if (!codProveedor.trim()) {
      showToast("El Código Proveedor es obligatorio", "error");
      return;
    }
    if (!sku.trim()) {
      showToast("El SKU es obligatorio", "error");
      return;
    }
    if (!descripcion.trim()) {
      showToast("La Descripción es obligatoria", "error");
      return;
    }

    // Check if SKU already exists
    if (products.some(p => p.codigoProducto === sku.trim())) {
      showToast(`El código SKU "${sku}" ya existe en el maestro.`, "error");
      return;
    }

    // Parse precioLista handling Argentinian comma
    let rawPrice = precioLista.trim();
    if (rawPrice.includes('.') && rawPrice.includes(',')) {
      if (rawPrice.lastIndexOf(',') > rawPrice.lastIndexOf('.')) {
        rawPrice = rawPrice.replace(/\./g, '').replace(/,/g, '.');
      } else {
        rawPrice = rawPrice.replace(/,/g, '');
      }
    } else if (rawPrice.includes(',')) {
      rawPrice = rawPrice.replace(/,/g, '.');
    }
    const cleanPrice = parseFloat(rawPrice.replace(/[^0-9.-]+/g, ''));
    if (isNaN(cleanPrice) || cleanPrice < 0) {
      showToast("El Precio de Lista debe ser un número válido (ej. 3599,28)", "error");
      return;
    }

    const cleanStock = parseInt(stock) || 0;

    // Create Raw Product
    const newRawItem = {
      proveedor: finalProveedor,
      codigoProducto: sku.trim(),
      descripcion: descripcion.trim().toUpperCase(),
      descCorta: descripcion.substring(0, 15).trim().toUpperCase(),
      unidadesPorBulto: 1,
      precioLista: cleanPrice,
      tasaIva: 21,
      impInterno: 0,
      vtaWeb: 'NO',
      fotos: fotoBase64 ? 'SI' : 'NO',
      fraccionVta: 0,
      cadenaDtos: '',
      dtosParticulares: '',
      codProveedor: codProveedor.trim().toUpperCase(),
      bloqCompra: 'NO',
      bloqVenta: 'NO',
      codigoEan: ean.trim() || sku.trim(),
      segundoEan: '',
      ultimoEan: ean.trim() || sku.trim(),
      gtin14: '',
      estadoGral: '01 - Activo',
      cjaXPallet: 1,
      cjasXCam: 1,
      resultado: 'COMPLETADO',
      compraTotal: cleanStock,
      ventas: [] as SaleRecord[], // New product starts with 0 sales
      fotoBase64: fotoBase64 || undefined // Store Base64 photo
    };

    // Enrich and save
    const enriched = enrichProduct(newRawItem as any);
    onAddProduct(enriched);
    
    setIsModalOpen(false);
    stopCamera();
    showToast(`¡Producto "${enriched.descripcion}" creado con éxito!`, "success");
  };

  useEffect(() => {
    return () => {
      // Cleanup camera on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Determine completeness score
  const loadedCount = (importStatus.general.loaded ? 1 : 0) + 
                      (importStatus.compra.loaded ? 1 : 0) + 
                      (importStatus.venta.loaded ? 1 : 0);
  const isFullyLoaded = loadedCount === 3;

  return (
    <div className="space-y-6" id="new-product-manager-root">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 p-4 rounded-xl shadow-lg border text-white font-medium transition-all animate-bounce ${
          notification.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* DASHBOARD CARD: DATA INTEGRITY & SYNCHRONIZATION STATUS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-white">
            <Database className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight">Estado del Servidor de Datos</h2>
              <p className="text-xs text-slate-400 font-mono">Sincronización de Base de Datos Local</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
              isFullyLoaded 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isFullyLoaded ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              {isFullyLoaded ? 'BASE COMPLETA (3/3)' : `BASE INCOMPLETA (${loadedCount}/3)`}
            </span>
            <button
              onClick={onResetToDemo}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              title="Restablecer base de datos a los valores demo de fábrica"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Demo
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Message */}
          {isFullyLoaded ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">✓ Sincronización Completa</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Los tres archivos maestros indispensables han sido cargados. El maestro de SKU y la lógica de cálculo de quiebres de stock están operando con precisión de depósito en base a datos reales actualizados.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">⚠ Sincronización Incompleta</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Falta cargar alguno de los 3 archivos obligatorios (General, Compra o Venta). La coctelera de cálculo de reposiciones y quiebre de stock requiere de la totalidad de estas planillas para arrojar predicciones correctas.
                </p>
              </div>
            </div>
          )}

          {/* Grid detailing the 3 files */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* File 1: General */}
            <div className={`rounded-xl border p-5 transition-all space-y-4 shadow-sm bg-white ${
              importStatus.general.loaded ? 'border-indigo-100 hover:border-indigo-200' : 'border-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className={`w-5 h-5 ${importStatus.general.loaded ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="font-bold text-slate-800 text-sm">1. Catálogo General</span>
                </div>
                {importStatus.general.loaded ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">CARGADO</span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">PENDIENTE</span>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 font-mono">
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Archivo:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[150px]" title={importStatus.general.fileName}>{importStatus.general.fileName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Registros:</span>
                  <span className="font-bold text-slate-800">{importStatus.general.count} prod.</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Actualización:</span>
                  <span className="font-bold text-slate-800">{importStatus.general.date}</span>
                </div>
              </div>
            </div>

            {/* File 2: Compra */}
            <div className={`rounded-xl border p-5 transition-all space-y-4 shadow-sm bg-white ${
              importStatus.compra.loaded ? 'border-indigo-100 hover:border-indigo-200' : 'border-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className={`w-5 h-5 ${importStatus.compra.loaded ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="font-bold text-slate-800 text-sm">2. Registro Compras</span>
                </div>
                {importStatus.compra.loaded ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">CARGADO</span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">PENDIENTE</span>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 font-mono">
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Archivo:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[150px]" title={importStatus.compra.fileName}>{importStatus.compra.fileName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Registros:</span>
                  <span className="font-bold text-slate-800">{importStatus.compra.count} prod.</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Actualización:</span>
                  <span className="font-bold text-slate-800">{importStatus.compra.date}</span>
                </div>
              </div>
            </div>

            {/* File 3: Venta */}
            <div className={`rounded-xl border p-5 transition-all space-y-4 shadow-sm bg-white ${
              importStatus.venta.loaded ? 'border-indigo-100 hover:border-indigo-200' : 'border-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCode className={`w-5 h-5 ${importStatus.venta.loaded ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="font-bold text-slate-800 text-sm">3. Historial Ventas</span>
                </div>
                {importStatus.venta.loaded ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">CARGADO</span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">PENDIENTE</span>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 font-mono">
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Archivo:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[150px]" title={importStatus.venta.fileName}>{importStatus.venta.fileName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-slate-400">Registros:</span>
                  <span className="font-bold text-slate-800">{importStatus.venta.count} ventas</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Actualización:</span>
                  <span className="font-bold text-slate-800">{importStatus.venta.date}</span>
                </div>
              </div>
            </div>

          </div>

          <div className="text-xs text-slate-400 font-mono italic text-center">
            * Nota: Una vez cargados los datos, no se borrarán en la tableta hasta que cargue una nueva actualización de archivos CSV.
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Alta Manual / Incorporación Manual de Productos
          </h3>
          <p className="text-xs text-slate-500">
            Cargue productos singulares directamente en el maestro de SKU. Es ideal para registrar muestras de proveedores, compras de emergencia de último minuto, o altas rápidas que requieran una fotografía real en depósito.
          </p>
        </div>
        <button
          onClick={openModal}
          className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Cargar Nuevo Producto
        </button>
      </div>

      {/* LIST OF REGISTERED NEW PRODUCTS (BASE DISTINTA) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="manual-products-list">
        <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Base de Datos de Productos Nuevos ({newManualProducts.length})
            </h3>
            <p className="text-xs text-slate-400">
              Productos creados manualmente en esta sesión para exportación independiente de catálogo
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={exportManualProductsToCSV}
              disabled={newManualProducts.length === 0}
              className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-colors border w-full sm:w-auto justify-center ${
                newManualProducts.length > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Nuevos (CSV)
            </button>
            
            {newManualProducts.length > 0 && (
              <button
                onClick={onClearNewManualProducts}
                className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-colors w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vaciar Base
              </button>
            )}
          </div>
        </div>

        {newManualProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50/50">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
            <h4 className="font-bold text-slate-700 text-sm">No hay productos nuevos registrados</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Haga clic en "Cargar Nuevo Producto" para dar de alta registros de prueba o muestras que luego podrá exportar en un archivo CSV limpio e independiente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-[80px] text-center">Foto</th>
                  <th className="py-3 px-4 w-[180px]">Proveedor</th>
                  <th className="py-3 px-4 w-[120px]">Códigos (Int/Prov)</th>
                  <th className="py-3 px-4">Descripción del Producto</th>
                  <th className="py-3 px-4 w-[140px] font-mono">EAN/Barras</th>
                  <th className="py-3 px-4 w-[100px] text-right">P. Lista</th>
                  <th className="py-3 px-4 w-[100px] text-right">Stock</th>
                  <th className="py-3 px-4 w-[80px] text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {newManualProducts.map((p) => (
                  <tr key={p.codigoProducto} className="hover:bg-slate-50/50 transition-colors">
                    {/* Foto */}
                    <td className="py-2 px-4 text-center">
                      {p.fotoBase64 ? (
                        <div className="w-10 h-10 bg-white border rounded overflow-hidden flex items-center justify-center p-0.5 mx-auto">
                          <img src={p.fotoBase64} alt={p.descripcion} className="w-full h-full object-contain rounded" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 border rounded flex items-center justify-center text-slate-400 font-mono text-[8px] uppercase font-bold text-center mx-auto" title="Sin fotografía">
                          S/F
                        </div>
                      )}
                    </td>

                    {/* Proveedor */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 line-clamp-1 text-xs" title={p.proveedor}>
                        {p.proveedor}
                      </span>
                    </td>

                    {/* Códigos */}
                    <td className="py-3 px-4 font-mono text-xs space-y-0.5">
                      <div className="text-slate-900">Int: <strong>{p.codigoProducto}</strong></div>
                      <div className="text-slate-500">Prov: {p.codProveedor}</div>
                    </td>

                    {/* Descripción */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs line-clamp-1" title={p.descripcion}>
                        {p.descripcion}
                      </div>
                      <div className="text-[10px] text-slate-400">Creado en sesión</div>
                    </td>

                    {/* EAN */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {p.ultimoEan}
                    </td>

                    {/* Precio Lista */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                      {formatPrice(p.precioLista)}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                      {p.compraTotal} u
                    </td>

                    {/* Acción */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteIndividualProduct(p.codigoProducto)}
                        type="button"
                        title="Eliminar producto"
                        className="p-1.5 text-rose-600 hover:text-rose-950 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: MANUAL PRODUCT UPLOAD (Alta Individual) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-md uppercase tracking-tight">Alta Manual de Producto</h3>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); stopCamera(); }}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Proveedor */}
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Proveedor</label>
                  <select
                    value={proveedorSelect}
                    onChange={(e) => setProveedorSelect(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:border-indigo-500 focus:bg-white outline-none"
                  >
                    <option value="VESTA IMPORT S.A.">VESTA IMPORT S.A.</option>
                    <option value="ROCIG S.A.">ROCIG S.A.</option>
                    <option value="ESTRELLA S.A.">ESTRELLA S.A.</option>
                    <option value="DISTRIBUIDORA SUR">DISTRIBUIDORA SUR</option>
                    <option value="OTRO">OTRO (Especificar abajo)...</option>
                  </select>
                  
                  {proveedorSelect === 'OTRO' && (
                    <input
                      type="text"
                      value={proveedorCustom}
                      onChange={(e) => setProveedorCustom(e.target.value)}
                      placeholder="Ingrese el nombre del proveedor custom"
                      className="w-full mt-2 p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none uppercase font-bold"
                      required
                    />
                  )}
                </div>

                {/* 2. Código Proveedor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Código de Proveedor (Art.)</label>
                  <input
                    type="text"
                    value={codProveedor}
                    onChange={(e) => setCodProveedor(e.target.value)}
                    placeholder="ej. 51240 / FR00247"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:bg-white outline-none font-mono uppercase font-semibold"
                    required
                  />
                </div>

                {/* 3. Código Interno / SKU */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">SKU / Cód. Interno</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono font-bold text-indigo-700 outline-none"
                    required
                  />
                </div>

                {/* 4. Descripción del Producto */}
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Descripción del Producto</label>
                  <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="ej. PINA GLITTER 9 CM ART.51240 X 6 UNIDADES"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:bg-white outline-none font-medium uppercase"
                    required
                  />
                </div>

                {/* 5. Código EAN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Código de Barras EAN</label>
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    placeholder="Código de barras EAN13"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:bg-white outline-none font-mono font-semibold"
                  />
                </div>

                {/* 6. Precio de Lista */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Precio de Lista / Costo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">$</span>
                    <input
                      type="text"
                      value={precioLista}
                      onChange={(e) => setPrecioLista(e.target.value)}
                      placeholder="ej. 3599,28"
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:bg-white outline-none font-mono font-bold"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Introduzca decimales con coma (ej. 3599,28)</span>
                </div>

                {/* 7. Cantidad de Ingreso / Stock */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cantidad Comprada (Stock Inicial)</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="ej. 60"
                    min="0"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:bg-white outline-none font-mono font-semibold"
                    required
                  />
                </div>

                {/* 8. Foto del Producto (Cargar o Sacar) */}
                <div className="space-y-2 col-span-2 border-t border-slate-100 pt-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Foto del Producto (Cámara o Archivo)</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Capture buttons */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {/* Camera button */}
                        <button
                          type="button"
                          onClick={isCameraActive ? stopCamera : startCamera}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-lg border uppercase tracking-wider transition-colors ${
                            isCameraActive
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          }`}
                        >
                          <Camera className="w-4 h-4" />
                          {isCameraActive ? "Apagar Cámara" : "Sacar Foto"}
                        </button>

                        {/* File Upload button */}
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 uppercase tracking-wider cursor-pointer text-center transition-colors">
                          <Upload className="w-4 h-4" />
                          Importar Foto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Camera View Window */}
                      {isCameraActive && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-black relative aspect-video">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transition-transform active:scale-95"
                            >
                              Capturar Fotografía
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview box */}
                    <div className="border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50 min-h-[120px] relative">
                      {fotoBase64 ? (
                        <>
                          <img
                            src={fotoBase64}
                            alt="Vista previa del producto"
                            className="max-h-[140px] max-w-full rounded-lg object-contain bg-white border"
                          />
                          <button
                            type="button"
                            onClick={() => setFotoBase64(null)}
                            className="absolute top-2 right-2 p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-full shadow transition-colors"
                            title="Remover foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-slate-400 space-y-1 py-4">
                          <Camera className="w-8 h-8 mx-auto stroke-[1.5]" />
                          <p className="text-xs font-medium">Vista Previa de la Foto</p>
                          <p className="text-[10px]">Utilice la cámara o suba un archivo de imagen</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Actions */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3 font-medium">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); stopCamera(); }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg uppercase tracking-wider shadow transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Guardar en Maestro SKU
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
