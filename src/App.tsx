import React, { useState, useEffect } from 'react';
import SkuScanner from './components/SkuScanner';
import ReplenishmentList from './components/ReplenishmentList';
import SavedOrders from './components/SavedOrders';
import NewProductManager, { ImportStatus } from './components/NewProductManager';
import { Product, OrderItem } from './types';
import { mockProducts } from './data/mockProducts';
import { Scan, ShoppingCart, ListOrdered, Calendar, Battery, Wifi, PlusCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'scanner' | 'replenishment' | 'orders' | 'new-product';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scanner');
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('maestro_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved products", e);
      }
    }
    return mockProducts;
  });
  
  const [importStatus, setImportStatus] = useState<ImportStatus>(() => {
    const saved = localStorage.getItem('maestro_import_status');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved import status", e);
      }
    }
    const initialProductCount = mockProducts.length;
    const initialCompraCount = mockProducts.reduce((sum, p) => sum + (p.compraTotal > 0 ? 1 : 0), 0);
    const initialVentaCount = mockProducts.reduce((sum, p) => sum + p.ventas.length, 0);

    return {
      general: { loaded: true, fileName: 'Catalogo_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialProductCount },
      compra: { loaded: true, fileName: 'Compras_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialCompraCount },
      venta: { loaded: true, fileName: 'Ventas_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialVentaCount },
    };
  });

  const [selectedProductForReplenishment, setSelectedProductForReplenishment] = useState<Product | null>(null);
  
  // Separate list/database for manually added new products to allow distinct export
  const [newManualProducts, setNewManualProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('maestro_new_manual_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved manual products", e);
      }
    }
    return [];
  });

  // Cart state
  const [savedQuantities, setSavedQuantities] = useState<Record<string, number>>({});
  const [savedOrder, setSavedOrder] = useState<OrderItem[]>([]);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('maestro_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('maestro_import_status', JSON.stringify(importStatus));
  }, [importStatus]);

  useEffect(() => {
    localStorage.setItem('maestro_new_manual_products', JSON.stringify(newManualProducts));
  }, [newManualProducts]);

  // Handlers for manual additions and status updates
  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
    setNewManualProducts((prev) => [newProduct, ...prev]);

    // Update General file count in status
    setImportStatus((prev) => {
      const nowStr = new Date().toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      return {
        ...prev,
        general: {
          ...prev.general,
          count: prev.general.count + 1,
          date: nowStr
        }
      };
    });
  };

  const handleClearNewManualProducts = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Vaciar Base de Productos Nuevos',
      message: '¿Está seguro de que desea borrar todos los productos registrados manualmente? Se eliminarán de la base de nuevos productos y de la vista general.',
      confirmText: 'Sí, Vaciar Base',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        const manualSkus = new Set(newManualProducts.map(p => p.codigoProducto));
        setProducts(prev => prev.filter(p => !manualSkus.has(p.codigoProducto)));
        setNewManualProducts([]);
      }
    });
  };

  const handleDeleteIndividualProduct = (codigoProducto: string) => {
    const productToDelete = newManualProducts.find(p => p.codigoProducto === codigoProducto);
    if (!productToDelete) return;

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Producto Nuevo',
      message: `¿Está seguro de que desea eliminar el producto "${productToDelete.descripcion}" (${codigoProducto}) de la base de nuevos productos?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        setProducts(prev => prev.filter(p => p.codigoProducto !== codigoProducto));
        setNewManualProducts(prev => prev.filter(p => p.codigoProducto !== codigoProducto));
      }
    });
  };

  const handleUpdateImportStatus = (type: 'GENERAL' | 'COMPRA' | 'VENTA', fileName: string, count: number) => {
    const nowStr = new Date().toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    setImportStatus((prev) => {
      const key = type === 'GENERAL' ? 'general' : type === 'COMPRA' ? 'compra' : 'venta';
      return {
        ...prev,
        [key]: {
          loaded: true,
          fileName,
          date: nowStr,
          count
        }
      };
    });
  };

  const handleResetToDemo = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restablecer Datos de Demostración',
      message: '¿Está seguro de que desea restablecer todos los datos del maestro de SKU a los valores demo iniciales? Se perderán todos los cambios manuales y archivos importados.',
      confirmText: 'Sí, Restablecer',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        localStorage.removeItem('maestro_products');
        localStorage.removeItem('maestro_import_status');
        localStorage.removeItem('maestro_new_manual_products');
        setProducts(mockProducts);
        setNewManualProducts([]);
        
        const initialProductCount = mockProducts.length;
        const initialCompraCount = mockProducts.reduce((sum, p) => sum + (p.compraTotal > 0 ? 1 : 0), 0);
        const initialVentaCount = mockProducts.reduce((sum, p) => sum + p.ventas.length, 0);

        setImportStatus({
          general: { loaded: true, fileName: 'Catalogo_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialProductCount },
          compra: { loaded: true, fileName: 'Compras_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialCompraCount },
          venta: { loaded: true, fileName: 'Ventas_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialVentaCount },
        });
      }
    });
  };

  // Navigation handlers
  const handleSelectProductForReplenishment = (product: Product) => {
    setSelectedProductForReplenishment(product);
    setActiveTab('replenishment');
  };

  const handleSaveOrder = (items: OrderItem[]) => {
    setSavedOrder(items);
  };

  const handleUpdateQuantityFromSummary = (code: string, qty: number) => {
    const updatedQuantities = { ...savedQuantities };
    if (qty <= 0) {
      delete updatedQuantities[code];
    } else {
      updatedQuantities[code] = qty;
    }
    setSavedQuantities(updatedQuantities);

    // Also update order item list directly
    const updatedOrder = savedOrder
      .map(item => item.codigoProducto === code ? { ...item, cantidadPedir: qty } : item)
      .filter(item => item.cantidadPedir > 0);
    setSavedOrder(updatedOrder);
  };

  const handleClearOrder = () => {
    setSavedQuantities({});
    setSavedOrder([]);
  };

  // Filter out manual products from general views so they only show up in New Product base
  const mainProducts = products.filter(
    p => !newManualProducts.some(m => m.codigoProducto === p.codigoProducto)
  );

  // Get current date string formatted
  const currentDate = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" id="app-shell-root">
      
      {/* INDUSTRIAL HEADER BAR */}
      <header className="bg-slate-900 border-b border-slate-800 shadow-md text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner animate-pulse">
            SKU
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Maestro SKU</h1>
            <p className="text-xs text-slate-400 font-medium">Colector Manual & Tablet Industrial v2.1</p>
          </div>
        </div>

        {/* Live system indicators */}
        <div className="flex items-center gap-5 text-slate-300 text-xs font-mono">
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize">{currentDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <Battery className="w-4.5 h-4.5 text-emerald-400" />
              <span>100%</span>
            </div>
          </div>
        </div>
      </header>

      {/* SLIDING TAB BAR / SELECTOR ("Display corredizo") */}
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-30 shadow-sm px-6">
        <div className="max-w-7xl mx-auto flex">
          
          {/* Tab Button 1: Scanner */}
          <button
            onClick={() => setActiveTab('scanner')}
            className={`py-4 px-6 font-bold text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all relative outline-none ${
              activeTab === 'scanner'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scan className="w-4 h-4" />
            Consulta Rápida
            {activeTab === 'scanner' && (
              <motion.div 
                layoutId="active-tab-line" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              />
            )}
          </button>

          {/* Tab Button 2: Replenishment List */}
          <button
            onClick={() => {
              setActiveTab('replenishment');
              // Clear temporary selection when navigating manually
              setSelectedProductForReplenishment(null);
            }}
            className={`py-4 px-6 font-bold text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all relative outline-none ${
              activeTab === 'replenishment'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            Abastecer & Reposición
            {Object.values(savedQuantities).filter((q): q is number => typeof q === 'number' && q > 0).length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 rounded-full text-xs px-2 py-0.5 font-black">
                {Object.values(savedQuantities).filter((q): q is number => typeof q === 'number' && q > 0).length}
              </span>
            )}
            {activeTab === 'replenishment' && (
              <motion.div 
                layoutId="active-tab-line" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              />
            )}
          </button>

          {/* Tab Button 3: Active Order Resume */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-6 font-bold text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all relative outline-none ${
              activeTab === 'orders'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Nota de Pedido
            {savedOrder.length > 0 && (
              <span className="bg-rose-500 text-white rounded-full text-xs px-2 py-0.5 font-bold animate-pulse">
                {savedOrder.length}
              </span>
            )}
            {activeTab === 'orders' && (
              <motion.div 
                layoutId="active-tab-line" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              />
            )}
          </button>

          {/* Tab Button 4: New Product & Sync */}
          <button
            onClick={() => setActiveTab('new-product')}
            className={`py-4 px-6 font-bold text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all relative outline-none ${
              activeTab === 'new-product'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Alta & Sincro CSV
            {activeTab === 'new-product' && (
              <motion.div 
                layoutId="active-tab-line" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
              />
            )}
          </button>

        </div>
      </div>

      {/* SLIDING CONTENT DISPLAY ("Display corredizo") */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'scanner' && (
            <motion.div
              key="scanner-view"
              initial={{ x: -150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 150, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <SkuScanner products={mainProducts} onSelectProduct={handleSelectProductForReplenishment} />
            </motion.div>
          )}

          {activeTab === 'replenishment' && (
            <motion.div
              key="replenishment-view"
              initial={{ x: 150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -150, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <ReplenishmentList
                products={mainProducts}
                initialSelectedProduct={selectedProductForReplenishment}
                onSaveOrder={handleSaveOrder}
                savedQuantities={savedQuantities}
                onUpdateQuantities={setSavedQuantities}
                onImportProducts={setProducts}
                onUpdateImportStatus={handleUpdateImportStatus}
              />
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders-view"
              initial={{ x: 150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -150, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <SavedOrders
                orderItems={savedOrder}
                onClearOrder={handleClearOrder}
                onUpdateQuantity={handleUpdateQuantityFromSummary}
                onBackToReplenishment={() => setActiveTab('replenishment')}
              />
            </motion.div>
          )}

          {activeTab === 'new-product' && (
            <motion.div
              key="new-product-view"
              initial={{ x: 150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -150, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <NewProductManager
                products={products}
                newManualProducts={newManualProducts}
                onAddProduct={handleAddProduct}
                onClearNewManualProducts={handleClearNewManualProducts}
                onDeleteIndividualProduct={handleDeleteIndividualProduct}
                importStatus={importStatus}
                onResetToDemo={handleResetToDemo}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SOLID FOOTER FOR TABLET PREVIEW */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-4 px-6 text-xs flex justify-between items-center mt-auto font-mono">
        <div>
          Concebido para Tablets Industriales de Depósito.
        </div>
        <div>
          Soporte Teclado Emulado (Lector Laser) Activado.
        </div>
      </footer>

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${confirmModal.isDanger ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-base">{confirmModal.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className={`px-4 py-2 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                  confirmModal.isDanger 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
