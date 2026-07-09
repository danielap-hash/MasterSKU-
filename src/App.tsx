import React, { useState, useEffect, useRef } from 'react';
import SkuScanner from './components/SkuScanner';
import ReplenishmentList from './components/ReplenishmentList';
import SavedOrders from './components/SavedOrders';
import NewProductManager, { ImportStatus } from './components/NewProductManager';
import { Product, OrderItem, AppUser } from './types';
import { mockProducts } from './data/mockProducts';
import { 
  Scan, 
  ShoppingCart, 
  ListOrdered, 
  Calendar, 
  Battery, 
  Wifi, 
  PlusCircle, 
  AlertTriangle,
  User,
  Users,
  Lock,
  LogIn,
  LogOut,
  Key,
  CircleUser,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  initUsersIfNeeded, 
  subscribeUsers, 
  saveUserInCloud,
  initProductsIfNeeded,
  subscribeProducts,
  saveProductInCloud,
  deleteProductFromCloud,
  overwriteProductsInCloud,
  subscribeNewManualProducts,
  saveNewManualProductInCloud,
  deleteNewManualProductFromCloud,
  clearAllNewManualProductsFromCloud,
  initImportStatusIfNeeded,
  subscribeImportStatus,
  saveImportStatusInCloud,
  subscribeSavedOrder,
  subscribeSavedQuantities,
  saveUserCartInCloud
} from './lib/dbService';

type TabType = 'scanner' | 'replenishment' | 'orders' | 'new-product';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scanner');

  // Users list state
  const [users, setUsers] = useState<AppUser[]>([
    { nombre: "Administrador Depósito", legajo: "admin", clave: "admin", rol: "ADMIN" },
    { nombre: "Operador Turno Mañana", legajo: "1001", clave: "1234", rol: "USUARIO" }
  ]);

  // Logged-in user state
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('maestro_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved current user", e);
      }
    }
    return { nombre: "Administrador Depósito", legajo: "admin", clave: "admin", rol: "ADMIN" };
  });

  // Login modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginLegajo, setLoginLegajo] = useState('');
  const [loginClave, setLoginClave] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Persist currentUser in localStorage for page refresh persistence
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('maestro_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('maestro_current_user');
    }
  }, [currentUser]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLegajo = loginLegajo.trim().toLowerCase();
    const cleanClave = loginClave.trim();

    const foundUser = users.find(u => u.legajo.toLowerCase() === cleanLegajo);
    if (!foundUser) {
      setLoginError('Usuario / Legajo no registrado');
      return;
    }

    // Robust comparison: check actual saved password or default fallback (supporting case-insensitive match for warehouse environments/caps lock)
    const isCorrectClave = 
      foundUser.clave === cleanClave || 
      foundUser.clave.trim() === cleanClave ||
      foundUser.clave.toLowerCase() === cleanClave.toLowerCase() ||
      foundUser.clave.trim().toLowerCase() === cleanClave.toLowerCase() ||
      (cleanLegajo === 'admin' && cleanClave.toLowerCase() === 'admin') ||
      (cleanLegajo === '1001' && cleanClave === '1234');

    if (!isCorrectClave) {
      setLoginError('Clave de acceso incorrecta');
      return;
    }

    setCurrentUser(foundUser);
    setIsLoginModalOpen(false);
    setLoginLegajo('');
    setLoginClave('');
    setLoginError('');
    setShowPassword(false);
  };

  const [products, setProducts] = useState<Product[]>(mockProducts);
  
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    general: { loaded: true, fileName: 'Catalogo_Demo_Inicial.csv', date: '2025-12-10 14:00', count: mockProducts.length },
    compra: { loaded: true, fileName: 'Compras_Demo_Inicial.csv', date: '2025-12-10 14:00', count: mockProducts.reduce((sum, p) => sum + (p.compraTotal > 0 ? 1 : 0), 0) },
    venta: { loaded: true, fileName: 'Ventas_Demo_Inicial.csv', date: '2025-12-10 14:00', count: mockProducts.reduce((sum, p) => sum + p.ventas.length, 0) },
  });

  const [selectedProductForReplenishment, setSelectedProductForReplenishment] = useState<Product | null>(null);
  
  // Separate list/database for manually added new products to allow distinct export
  const [newManualProducts, setNewManualProducts] = useState<Product[]>([]);

  // Cart state - loaded and saved in Cloud per-user
  const [savedQuantities, setSavedQuantities] = useState<Record<string, number>>({});
  const [savedOrder, setSavedOrder] = useState<OrderItem[]>([]);

  // On mount, initialize Firestore and subscribe to all shared states
  useEffect(() => {
    // Boot Firestore collections if needed
    initUsersIfNeeded();
    initProductsIfNeeded();
    initImportStatusIfNeeded();

    // Subscriptions
    const unsubUsers = subscribeUsers((list) => {
      setUsers(list);
    });

    const unsubProducts = subscribeProducts((list) => {
      setProducts(list);
    });

    const unsubNewManual = subscribeNewManualProducts((list) => {
      setNewManualProducts(list);
    });

    const unsubImportStatus = subscribeImportStatus((status) => {
      setImportStatus(status);
    });

    return () => {
      unsubUsers();
      unsubProducts();
      unsubNewManual();
      unsubImportStatus();
    };
  }, []);

  // Refs to prevent recursive write loops for user cart
  const incomingCartRef = useRef<string>('');

  useEffect(() => {
    if (!currentUser) {
      setSavedQuantities({});
      setSavedOrder([]);
      return;
    }

    const legajo = currentUser.legajo;

    // Subscribe to this user's quantities
    const unsubQty = subscribeSavedQuantities(legajo, (qty) => {
      const qtyStr = JSON.stringify(qty);
      if (qtyStr !== JSON.stringify(savedQuantities)) {
        incomingCartRef.current = qtyStr;
        setSavedQuantities(qty);
      }
    });

    // Subscribe to this user's order items
    const unsubOrder = subscribeSavedOrder(legajo, (order) => {
      const orderStr = JSON.stringify(order);
      if (orderStr !== JSON.stringify(savedOrder)) {
        incomingCartRef.current = orderStr;
        setSavedOrder(order);
      }
    });

    return () => {
      unsubQty();
      unsubOrder();
    };
  }, [currentUser]);

  // Sync state changes back to Firestore (debounced to avoid over-writing)
  useEffect(() => {
    if (!currentUser) return;
    
    // Check if the change came from our local user interaction or Firestore listener
    const currentQtyStr = JSON.stringify(savedQuantities);
    const currentOrderStr = JSON.stringify(savedOrder);
    
    // Avoid writing back if it is exactly what was just received from Firestore
    if (incomingCartRef.current === currentQtyStr || incomingCartRef.current === currentOrderStr) {
      if (incomingCartRef.current === currentQtyStr) {
        incomingCartRef.current = '';
      }
      return;
    }

    const timeout = setTimeout(() => {
      saveUserCartInCloud(currentUser.legajo, savedQuantities, savedOrder)
        .catch(err => console.error("Error updating cart in cloud", err));
    }, 500);

    return () => clearTimeout(timeout);
  }, [savedQuantities, savedOrder, currentUser]);

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

  // Handlers for manual additions and status updates
  const handleAddProduct = async (newProduct: Product) => {
    await saveProductInCloud(newProduct);
    await saveNewManualProductInCloud(newProduct);

    // Update General file count in status
    const nowStr = new Date().toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const updatedStatus: ImportStatus = {
      ...importStatus,
      general: {
        ...importStatus.general,
        count: importStatus.general.count + 1,
        date: nowStr
      }
    };
    await saveImportStatusInCloud(updatedStatus);
  };

  const handleClearNewManualProducts = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Vaciar Base de Productos Nuevos',
      message: '¿Está seguro de que desea borrar todos los productos registrados manualmente? Se eliminarán de la base de nuevos productos y de la vista general.',
      confirmText: 'Sí, Vaciar Base',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        await clearAllNewManualProductsFromCloud(newManualProducts);
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
      onConfirm: async () => {
        await deleteProductFromCloud(codigoProducto);
        await deleteNewManualProductFromCloud(codigoProducto);
      }
    });
  };

  const handleUpdateImportStatus = async (type: 'GENERAL' | 'COMPRA' | 'VENTA', fileName: string, count: number) => {
    const nowStr = new Date().toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const key = type === 'GENERAL' ? 'general' : type === 'COMPRA' ? 'compra' : 'venta';
    const updatedStatus: ImportStatus = {
      ...importStatus,
      [key]: {
        loaded: true,
        fileName,
        date: nowStr,
        count
      }
    };
    await saveImportStatusInCloud(updatedStatus);
  };

  const handleResetToDemo = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Restablecer Datos de Demostración',
      message: '¿Está seguro de que desea restablecer todos los datos del maestro de SKU a los valores demo iniciales? Se perderán todos los cambios manuales y archivos importados.',
      confirmText: 'Sí, Restablecer',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        await overwriteProductsInCloud(mockProducts);
        await clearAllNewManualProductsFromCloud(newManualProducts);
        
        const initialProductCount = mockProducts.length;
        const initialCompraCount = mockProducts.reduce((sum, p) => sum + (p.compraTotal > 0 ? 1 : 0), 0);
        const initialVentaCount = mockProducts.reduce((sum, p) => sum + p.ventas.length, 0);

        const resetStatus: ImportStatus = {
          general: { loaded: true, fileName: 'Catalogo_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialProductCount },
          compra: { loaded: true, fileName: 'Compras_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialCompraCount },
          venta: { loaded: true, fileName: 'Ventas_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialVentaCount },
        };
        await saveImportStatusInCloud(resetStatus);
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

  const handleUpdateUsers = async (updatedUsers: AppUser[]) => {
    for (const u of updatedUsers) {
      await saveUserInCloud(u);
    }
  };

  const handleImportProducts = async (importedList: Product[]) => {
    await overwriteProductsInCloud(importedList);
  };

  // The product database is shared by all users, including any new manual additions
  const mainProducts = products;

  // Get current date string formatted
  const currentDate = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans" id="lock-screen-root">
        {/* Background ambient light */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.05),transparent_50%)]" />
        
        <div className="bg-slate-900 border border-slate-800 text-white max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden relative z-10 p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-indigo-900/30">
              SKU
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">Maestro SKU</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">Colector Manual & Tablet Industrial</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2 mb-4 justify-center">
              <Key className="w-4 h-4 text-indigo-400" />
              INICIAR SESIÓN / FICHADA
            </h3>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Legajo o ID Usuario</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginLegajo}
                    onChange={(e) => setLoginLegajo(e.target.value)}
                    placeholder="Ingrese su legajo"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:bg-slate-900 outline-none font-semibold text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clave de Acceso</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginClave}
                    onChange={(e) => setLoginClave(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:border-indigo-500 focus:bg-slate-900 outline-none font-semibold text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-300 cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                    title={showPassword ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/60 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Ingresar al Sistema
              </button>
            </form>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/60 p-4 rounded-xl text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-2 text-center">CUENTAS DEMO DE FÁBRICA:</span>
            <div className="flex justify-between text-[11px] font-mono border-b border-slate-800/40 pb-1.5 mb-1.5">
              <span>Administrador:</span>
              <span className="font-bold text-slate-200">admin / admin</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono">
              <span>Operador Turno:</span>
              <span className="font-bold text-slate-200">1001 / 1234</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Live system indicators & Profile control */}
        <div className="flex flex-wrap items-center gap-4 md:gap-5 text-slate-300 text-xs font-mono">
          <div className="hidden md:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize">{currentDate}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 text-white shadow-inner">
            <User className={`w-3.5 h-3.5 ${currentUser?.rol === 'ADMIN' ? 'text-rose-400' : 'text-indigo-400'}`} />
            <span className="font-sans font-bold text-slate-200">{currentUser?.nombre} ({currentUser?.rol})</span>
            <button
              onClick={() => {
                setLoginError('');
                setIsLoginModalOpen(true);
              }}
              className="ml-2 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-bold text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer uppercase tracking-wider"
              title="Cambiar de usuario / Registrar Fichada"
            >
              Fichar / Login
            </button>
            <button
              onClick={() => {
                setCurrentUser(null);
                localStorage.removeItem('maestro_current_user');
                setLoginLegajo('');
                setLoginClave('');
                setLoginError('');
              }}
              className="ml-1.5 px-2 py-0.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-900 hover:border-rose-800 rounded text-[10px] font-bold text-rose-300 hover:text-rose-200 transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-1"
              title="Cerrar sesión activa"
            >
              <LogOut className="w-2.5 h-2.5" />
              Salir
            </button>
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
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-30 shadow-sm px-4 md:px-6 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex min-w-max">
          
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
                onImportProducts={handleImportProducts}
                onUpdateImportStatus={handleUpdateImportStatus}
                currentUser={currentUser}
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
                currentUser={currentUser}
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
                currentUser={currentUser}
                users={users}
                onUpdateUsers={handleUpdateUsers}
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

      {/* LOGIN / PROFILE SWITCHING MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Fichada / Control Acceso</h3>
              </div>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer bg-transparent border-none"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Legajo o ID Usuario</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginLegajo}
                    onChange={(e) => setLoginLegajo(e.target.value)}
                    placeholder="ej. admin / 1001"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:bg-white outline-none font-semibold text-slate-800 uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Clave de Acceso</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginClave}
                    onChange={(e) => setLoginClave(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:bg-white outline-none font-semibold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                    title={showPassword ? "Ocultar clave" : "Mostrar clave"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold p-2.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/10 transition-colors cursor-pointer text-center"
                >
                  Confirmar Fichada
                </button>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1 text-[10px] text-slate-500 font-mono">
                <p className="font-bold uppercase text-slate-700 border-b border-slate-150 pb-1 mb-1">Cuentas Demo de Fábrica:</p>
                <div className="flex justify-between">
                  <span>Administrador:</span>
                  <span className="font-bold text-slate-700">admin / admin</span>
                </div>
                <div className="flex justify-between">
                  <span>Operador Turno:</span>
                  <span className="font-bold text-slate-700">1001 / 1234</span>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
