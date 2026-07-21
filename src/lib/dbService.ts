import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { db, ensureAuthenticated } from './firebase';
import { Product, AppUser, OrderItem } from '../types';
import { mockProducts } from '../data/mockProducts';
import { ImportStatus } from '../components/NewProductManager';

// -------------------------------------------------------------
// CONNECTION STATUS & FAILOVER REPORTING
// -------------------------------------------------------------
export type ConnectionStatus = 'connected' | 'offline_quota' | 'offline';

let currentStatus: ConnectionStatus = 'connected';
const statusListeners = new Set<(status: ConnectionStatus) => void>();

export function subscribeConnectionState(callback: (status: ConnectionStatus) => void) {
  statusListeners.add(callback);
  callback(currentStatus);
  return () => {
    statusListeners.delete(callback);
  };
}

export function updateConnectionStatus(status: ConnectionStatus) {
  if (currentStatus !== status) {
    currentStatus = status;
    statusListeners.forEach(listener => listener(status));
  }
}

export function handleFirebaseError(err: any, context: string) {
  const errMsg = err?.message || String(err);
  console.warn(`[Firebase Failover - ${context}]`, errMsg);
  
  if (
    errMsg.includes('quota') || 
    errMsg.includes('Quota') || 
    errMsg.includes('resource-exhausted') || 
    errMsg.includes('resource_exhausted') || 
    errMsg.includes('exceeded') ||
    errMsg.includes('503')
  ) {
    updateConnectionStatus('offline_quota');
  } else {
    updateConnectionStatus('offline');
  }
}

// -------------------------------------------------------------
// LOCAL CACHE KEYS & HELPERS
// -------------------------------------------------------------
const CACHE_PRODUCTS = 'maestro_products_cache';
const CACHE_USERS = 'maestro_users_cache';
const CACHE_NEW_MANUAL = 'maestro_new_manual_cache';
const CACHE_IMPORT_STATUS = 'maestro_import_status_cache';
const CACHE_CART_PREFIX = 'maestro_cart_cache_';

function getLocalCache<T>(key: string, defaultValue: T): T {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.warn(`Error reading local cache for ${key}:`, err);
  }
  return defaultValue;
}

function setLocalCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error writing local cache for ${key}:`, err);
  }
}

// -------------------------------------------------------------
// CHUNKING AND PARTITIONING FOR MAXIMUM READ RESILIENCY (99% REDUCTION)
// -------------------------------------------------------------
const CHUNK_SIZE = 250;

function partitionProducts(products: Product[]): Record<string, Product[]> {
  const chunks: Record<string, Product[]> = {};
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    chunks[`chunk_${chunkIndex}`] = products.slice(i, i + CHUNK_SIZE);
  }
  return chunks;
}

// Helper to fully set products in chunked documents
async function saveProductsInChunks(products: Product[]): Promise<void> {
  const chunks = partitionProducts(products);
  const colRef = collection(db, 'products_chunks');
  const batch = writeBatch(db);
  
  Object.entries(chunks).forEach(([chunkId, productsList]) => {
    const docRef = doc(colRef, chunkId);
    batch.set(docRef, { products: productsList });
  });

  // Query existing chunk IDs to clean up leftovers
  try {
    const snapshot = await getDocs(colRef);
    snapshot.docs.forEach((docSnap) => {
      if (!chunks[docSnap.id]) {
        batch.delete(docSnap.ref);
      }
    });
  } catch (err) {
    handleFirebaseError(err, "saveProductsInChunks cleanup");
  }

  await batch.commit();
  updateConnectionStatus('connected');
}

// -------------------------------------------------------------
// USERS MANAGEMENT
// -------------------------------------------------------------
const defaultUsers: AppUser[] = [
  { nombre: "Administrador Depósito", legajo: "admin", clave: "admin", rol: "ADMIN" },
  { nombre: "Operador Turno Mañana", legajo: "1001", clave: "1234", rol: "USUARIO" }
];

export async function initUsersIfNeeded(): Promise<AppUser[]> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'users', 'list');
    const dSnapshot = await getDoc(docRef);
    
    if (!dSnapshot.exists()) {
      console.log("Seeding default users doc to Firestore...");
      await setDoc(docRef, { users: defaultUsers });
      setLocalCache(CACHE_USERS, defaultUsers);
      return defaultUsers;
    }
    
    const cloudUsers = dSnapshot.data().users as AppUser[];
    setLocalCache(CACHE_USERS, cloudUsers);
    updateConnectionStatus('connected');
    return cloudUsers;
  } catch (err) {
    handleFirebaseError(err, "initUsersIfNeeded");
    return getLocalCache<AppUser[]>(CACHE_USERS, defaultUsers);
  }
}

export function subscribeUsers(callback: (users: AppUser[]) => void) {
  const docRef = doc(db, 'users', 'list');
  
  return onSnapshot(docRef, 
    (snapshot) => {
      if (snapshot.exists()) {
        const cloudUsers = snapshot.data().users as AppUser[];
        setLocalCache(CACHE_USERS, cloudUsers);
        updateConnectionStatus('connected');
        callback(cloudUsers);
      } else {
        callback(defaultUsers);
      }
    },
    (error) => {
      handleFirebaseError(error, "subscribeUsers");
      callback(getLocalCache<AppUser[]>(CACHE_USERS, defaultUsers));
    }
  );
}

export async function saveUserInCloud(user: AppUser): Promise<void> {
  const localUsers = getLocalCache<AppUser[]>(CACHE_USERS, defaultUsers);
  const updated = localUsers.map(u => u.legajo === user.legajo ? user : u);
  if (!updated.some(u => u.legajo === user.legajo)) {
    updated.push(user);
  }
  setLocalCache(CACHE_USERS, updated);

  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'users', 'list');
    await setDoc(docRef, { users: updated });
    updateConnectionStatus('connected');
  } catch (err) {
    handleFirebaseError(err, "saveUserInCloud");
  }
}

// -------------------------------------------------------------
// PRODUCTS MANAGEMENT
// -------------------------------------------------------------
export async function initProductsIfNeeded(): Promise<Product[]> {
  try {
    await ensureAuthenticated();
    const colRef = collection(db, 'products_chunks');
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log("Seeding mock products in compact chunks...");
      await saveProductsInChunks(mockProducts);
      setLocalCache(CACHE_PRODUCTS, mockProducts);
      return mockProducts;
    }
    
    const mergedList: Product[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && Array.isArray(data.products)) {
        mergedList.push(...data.products);
      }
    });
    
    setLocalCache(CACHE_PRODUCTS, mergedList);
    updateConnectionStatus('connected');
    return mergedList;
  } catch (err) {
    handleFirebaseError(err, "initProductsIfNeeded");
    return getLocalCache<Product[]>(CACHE_PRODUCTS, mockProducts);
  }
}

export function subscribeProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, 'products_chunks');
  
  return onSnapshot(colRef, 
    (snapshot) => {
      if (currentStatus !== 'connected' && currentStatus !== 'offline') {
        // If we are in quota limit or offline mode, preserve the user's newer local database
        const local = getLocalCache<Product[]>(CACHE_PRODUCTS, []);
        if (local.length > 0) {
          callback(local);
          return;
        }
      }

      if (!snapshot.empty) {
        const mergedList: Product[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && Array.isArray(data.products)) {
            mergedList.push(...data.products);
          }
        });

        setLocalCache(CACHE_PRODUCTS, mergedList);
        updateConnectionStatus('connected');
        callback(mergedList);
      } else {
        const local = getLocalCache<Product[]>(CACHE_PRODUCTS, []);
        if (local.length > 0) {
          callback(local);
        } else {
          callback(mockProducts);
        }
      }
    },
    (error) => {
      handleFirebaseError(error, "subscribeProducts");
      callback(getLocalCache<Product[]>(CACHE_PRODUCTS, mockProducts));
    }
  );
}

export async function saveProductInCloud(product: Product): Promise<void> {
  const localProducts = getLocalCache<Product[]>(CACHE_PRODUCTS, mockProducts);
  const updated = localProducts.map(p => p.codigoProducto === product.codigoProducto ? product : p);
  if (!updated.some(p => p.codigoProducto === product.codigoProducto)) {
    updated.unshift(product);
  }
  setLocalCache(CACHE_PRODUCTS, updated);

  try {
    await ensureAuthenticated();
    await saveProductsInChunks(updated);
  } catch (err) {
    handleFirebaseError(err, "saveProductInCloud");
  }
}

export async function deleteProductFromCloud(codigoProducto: string): Promise<void> {
  const localProducts = getLocalCache<Product[]>(CACHE_PRODUCTS, mockProducts);
  const updated = localProducts.filter(p => p.codigoProducto !== codigoProducto);
  setLocalCache(CACHE_PRODUCTS, updated);

  try {
    await ensureAuthenticated();
    await saveProductsInChunks(updated);
  } catch (err) {
    handleFirebaseError(err, "deleteProductFromCloud");
  }
}

export async function saveMultipleProductsInCloud(productsList: Product[]): Promise<void> {
  setLocalCache(CACHE_PRODUCTS, productsList);
  try {
    await ensureAuthenticated();
    await saveProductsInChunks(productsList);
  } catch (err) {
    handleFirebaseError(err, "saveMultipleProductsInCloud");
  }
}

export async function overwriteProductsInCloud(productsList: Product[]): Promise<void> {
  await saveMultipleProductsInCloud(productsList);
}

// -------------------------------------------------------------
// NEW MANUAL PRODUCTS
// -------------------------------------------------------------
export function subscribeNewManualProducts(callback: (products: Product[]) => void) {
  const docRef = doc(db, 'newManualProducts', 'list');
  
  return onSnapshot(docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const list = snapshot.data().products as Product[] || [];
        setLocalCache(CACHE_NEW_MANUAL, list);
        updateConnectionStatus('connected');
        callback(list);
      } else {
        callback([]);
      }
    },
    (error) => {
      handleFirebaseError(error, "subscribeNewManualProducts");
      callback(getLocalCache<Product[]>(CACHE_NEW_MANUAL, []));
    }
  );
}

export async function saveNewManualProductInCloud(product: Product): Promise<void> {
  const localList = getLocalCache<Product[]>(CACHE_NEW_MANUAL, []);
  const updated = localList.filter(p => p.codigoProducto !== product.codigoProducto);
  updated.unshift(product);
  setLocalCache(CACHE_NEW_MANUAL, updated);

  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'newManualProducts', 'list');
    await setDoc(docRef, { products: updated });
    updateConnectionStatus('connected');
  } catch (err) {
    handleFirebaseError(err, "saveNewManualProductInCloud");
  }
}

export async function deleteNewManualProductFromCloud(codigoProducto: string): Promise<void> {
  const localList = getLocalCache<Product[]>(CACHE_NEW_MANUAL, []);
  const updated = localList.filter(p => p.codigoProducto !== codigoProducto);
  setLocalCache(CACHE_NEW_MANUAL, updated);

  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'newManualProducts', 'list');
    await setDoc(docRef, { products: updated });
    updateConnectionStatus('connected');
  } catch (err) {
    handleFirebaseError(err, "deleteNewManualProductFromCloud");
  }
}

export async function clearAllNewManualProductsFromCloud(productsList: Product[]): Promise<void> {
  setLocalCache(CACHE_NEW_MANUAL, []);
  
  // Also delete from main products cache
  const manualSkus = new Set(productsList.map(p => p.codigoProducto));
  const localProducts = getLocalCache<Product[]>(CACHE_PRODUCTS, mockProducts);
  const remainingProducts = localProducts.filter(p => !manualSkus.has(p.codigoProducto));
  setLocalCache(CACHE_PRODUCTS, remainingProducts);

  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'newManualProducts', 'list');
    await setDoc(docRef, { products: [] });
    await saveProductsInChunks(remainingProducts);
  } catch (err) {
    handleFirebaseError(err, "clearAllNewManualProductsFromCloud");
  }
}

// -------------------------------------------------------------
// IMPORT STATUS
// -------------------------------------------------------------
const defaultImportStatus: ImportStatus = {
  general: { loaded: true, fileName: 'Catalogo_Demo_Inicial.csv', date: '2025-12-10 14:00', count: mockProducts.length },
  compra: { loaded: true, fileName: 'Compras_Demo_Inicial.csv', date: '2025-12-10 14:00', count: mockProducts.reduce((sum, p) => sum + (p.compraTotal > 0 ? 1 : 0), 0) },
  venta: { loaded: true, fileName: 'Ventas_Demo_Inicial.csv', date: '2025-12-10 14:00', count: mockProducts.reduce((sum, p) => sum + p.ventas.length, 0) },
};

export async function initImportStatusIfNeeded(): Promise<ImportStatus> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'importStatus', 'status');
    const dSnapshot = await getDoc(docRef);
    
    if (!dSnapshot.exists()) {
      await setDoc(docRef, defaultImportStatus);
      setLocalCache(CACHE_IMPORT_STATUS, defaultImportStatus);
      return defaultImportStatus;
    }
    
    const status = dSnapshot.data() as ImportStatus;
    setLocalCache(CACHE_IMPORT_STATUS, status);
    updateConnectionStatus('connected');
    return status;
  } catch (err) {
    handleFirebaseError(err, "initImportStatusIfNeeded");
    return getLocalCache<ImportStatus>(CACHE_IMPORT_STATUS, defaultImportStatus);
  }
}

export function subscribeImportStatus(callback: (status: ImportStatus) => void) {
  const docRef = doc(db, 'importStatus', 'status');
  
  return onSnapshot(docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const status = snapshot.data() as ImportStatus;
        setLocalCache(CACHE_IMPORT_STATUS, status);
        updateConnectionStatus('connected');
        callback(status);
      } else {
        callback(defaultImportStatus);
      }
    },
    (error) => {
      handleFirebaseError(error, "subscribeImportStatus");
      callback(getLocalCache<ImportStatus>(CACHE_IMPORT_STATUS, defaultImportStatus));
    }
  );
}

export async function saveImportStatusInCloud(status: ImportStatus): Promise<void> {
  setLocalCache(CACHE_IMPORT_STATUS, status);
  try {
    await ensureAuthenticated();
    await setDoc(doc(db, 'importStatus', 'status'), status);
    updateConnectionStatus('connected');
  } catch (err) {
    handleFirebaseError(err, "saveImportStatusInCloud");
  }
}

// -------------------------------------------------------------
// SAVED ORDERS (Note de Pedido)
// -------------------------------------------------------------
export function subscribeSavedOrder(userLegajo: string, callback: (order: OrderItem[]) => void) {
  const docRef = doc(db, 'userCarts', userLegajo);
  
  return onSnapshot(docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        updateConnectionStatus('connected');
        callback(data.order || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      handleFirebaseError(error, `subscribeSavedOrder for ${userLegajo}`);
      const cached = getLocalCache<any>(`${CACHE_CART_PREFIX}${userLegajo}`, { order: [] });
      callback(cached.order || []);
    }
  );
}

export function subscribeSavedQuantities(userLegajo: string, callback: (quantities: Record<string, number>) => void) {
  const docRef = doc(db, 'userCarts', userLegajo);
  
  return onSnapshot(docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        updateConnectionStatus('connected');
        callback(data.quantities || {});
      } else {
        callback({});
      }
    },
    (error) => {
      handleFirebaseError(error, `subscribeSavedQuantities for ${userLegajo}`);
      const cached = getLocalCache<any>(`${CACHE_CART_PREFIX}${userLegajo}`, { quantities: {} });
      callback(cached.quantities || {});
    }
  );
}

export async function saveUserCartInCloud(
  userLegajo: string, 
  quantities: Record<string, number>, 
  order: OrderItem[]
): Promise<void> {
  const cartData = {
    quantities,
    order,
    updatedAt: new Date().toISOString()
  };
  setLocalCache(`${CACHE_CART_PREFIX}${userLegajo}`, cartData);

  try {
    await ensureAuthenticated();
    await setDoc(doc(db, 'userCarts', userLegajo), cartData);
    updateConnectionStatus('connected');
  } catch (err) {
    handleFirebaseError(err, `saveUserCartInCloud for ${userLegajo}`);
  }
}

export async function clearUserCartInCloud(userLegajo: string): Promise<void> {
  const emptyCart = {
    quantities: {},
    order: [],
    updatedAt: new Date().toISOString()
  };
  setLocalCache(`${CACHE_CART_PREFIX}${userLegajo}`, emptyCart);

  try {
    await ensureAuthenticated();
    await setDoc(doc(db, 'userCarts', userLegajo), emptyCart);
    updateConnectionStatus('connected');
  } catch (err) {
    handleFirebaseError(err, `clearUserCartInCloud for ${userLegajo}`);
  }
}
