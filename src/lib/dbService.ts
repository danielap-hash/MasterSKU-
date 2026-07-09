import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db, ensureAuthenticated } from './firebase';
import { Product, AppUser, OrderItem, SavedOrder } from '../types';
import { mockProducts } from '../data/mockProducts';
import { ImportStatus } from '../components/NewProductManager';

// Chunk helper for batch processing
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// -------------------------------------------------------------
// USERS MANAGEMENT
// -------------------------------------------------------------
const defaultUsers: AppUser[] = [
  { nombre: "Administrador Depósito", legajo: "admin", clave: "admin", rol: "ADMIN" },
  { nombre: "Operador Turno Mañana", legajo: "1001", clave: "1234", rol: "USUARIO" }
];

export async function initUsersIfNeeded(): Promise<AppUser[]> {
  await ensureAuthenticated();
  const colRef = collection(db, 'users');
  const snapshot = await getDocs(colRef);
  
  if (snapshot.empty) {
    console.log("Seeding default users to Firestore...");
    for (const u of defaultUsers) {
      await setDoc(doc(db, 'users', u.legajo), u);
    }
    return defaultUsers;
  }
  
  return snapshot.docs.map(d => d.data() as AppUser);
}

export function subscribeUsers(callback: (users: AppUser[]) => void) {
  const colRef = collection(db, 'users');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const usersList = snapshot.docs.map(d => d.data() as AppUser);
      callback(usersList);
    } else {
      callback(defaultUsers);
    }
  });
}

export async function saveUserInCloud(user: AppUser): Promise<void> {
  await ensureAuthenticated();
  await setDoc(doc(db, 'users', user.legajo), user);
}

// -------------------------------------------------------------
// PRODUCTS MANAGEMENT
// -------------------------------------------------------------
export async function initProductsIfNeeded(): Promise<Product[]> {
  await ensureAuthenticated();
  const colRef = collection(db, 'products');
  const snapshot = await getDocs(colRef);
  
  if (snapshot.empty) {
    console.log("Seeding mock products to Firestore...");
    await saveMultipleProductsInCloud(mockProducts);
    return mockProducts;
  }
  
  return snapshot.docs.map(d => d.data() as Product);
}

export function subscribeProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, 'products');
  return onSnapshot(colRef, (snapshot) => {
    if (!snapshot.empty) {
      const productsList = snapshot.docs.map(d => d.data() as Product);
      // Sort alphabetically or as received, we can keep original or code sorting
      callback(productsList);
    }
  });
}

export async function saveProductInCloud(product: Product): Promise<void> {
  await ensureAuthenticated();
  await setDoc(doc(db, 'products', product.codigoProducto), product);
}

export async function deleteProductFromCloud(codigoProducto: string): Promise<void> {
  await ensureAuthenticated();
  await deleteDoc(doc(db, 'products', codigoProducto));
}

export async function saveMultipleProductsInCloud(productsList: Product[]): Promise<void> {
  await ensureAuthenticated();
  const chunks = chunkArray(productsList, 400); // 400 is well below the 500 document limit for Firestore batches
  
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((product) => {
      const docRef = doc(db, 'products', product.codigoProducto);
      batch.set(docRef, product);
    });
    await batch.commit();
  }
}

// Helper to fully overwrite the products collection (e.g. for CSV imports)
export async function overwriteProductsInCloud(productsList: Product[]): Promise<void> {
  await ensureAuthenticated();
  
  // Fetch existing product IDs
  const colRef = collection(db, 'products');
  const snapshot = await getDocs(colRef);
  const existingIds = snapshot.docs.map(d => d.id);
  
  // Delete existing in batches
  const deleteChunks = chunkArray(existingIds, 400);
  for (const chunk of deleteChunks) {
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      batch.delete(doc(db, 'products', id));
    });
    await batch.commit();
  }
  
  // Set new products in batches
  await saveMultipleProductsInCloud(productsList);
}

// -------------------------------------------------------------
// NEW MANUAL PRODUCTS
// -------------------------------------------------------------
export function subscribeNewManualProducts(callback: (products: Product[]) => void) {
  const colRef = collection(db, 'newManualProducts');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => d.data() as Product);
    callback(list);
  });
}

export async function saveNewManualProductInCloud(product: Product): Promise<void> {
  await ensureAuthenticated();
  await setDoc(doc(db, 'newManualProducts', product.codigoProducto), product);
}

export async function deleteNewManualProductFromCloud(codigoProducto: string): Promise<void> {
  await ensureAuthenticated();
  await deleteDoc(doc(db, 'newManualProducts', codigoProducto));
}

export async function clearAllNewManualProductsFromCloud(productsList: Product[]): Promise<void> {
  await ensureAuthenticated();
  const chunks = chunkArray(productsList, 400);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((p) => {
      batch.delete(doc(db, 'newManualProducts', p.codigoProducto));
      // Also delete from general products list to keep it in sync
      batch.delete(doc(db, 'products', p.codigoProducto));
    });
    await batch.commit();
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
  await ensureAuthenticated();
  const docRef = doc(db, 'importStatus', 'status');
  const dSnapshot = await getDoc(docRef);
  
  if (!dSnapshot.exists()) {
    await setDoc(docRef, defaultImportStatus);
    return defaultImportStatus;
  }
  
  return dSnapshot.data() as ImportStatus;
}

export function subscribeImportStatus(callback: (status: ImportStatus) => void) {
  const docRef = doc(db, 'importStatus', 'status');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as ImportStatus);
    } else {
      callback(defaultImportStatus);
    }
  });
}

export async function saveImportStatusInCloud(status: ImportStatus): Promise<void> {
  await ensureAuthenticated();
  await setDoc(doc(db, 'importStatus', 'status'), status);
}

// -------------------------------------------------------------
// SAVED ORDERS (Note de Pedido)
// -------------------------------------------------------------
export function subscribeSavedOrder(userLegajo: string, callback: (order: OrderItem[]) => void) {
  const docRef = doc(db, 'userCarts', userLegajo);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data.order || []);
    } else {
      callback([]);
    }
  });
}

export function subscribeSavedQuantities(userLegajo: string, callback: (quantities: Record<string, number>) => void) {
  const docRef = doc(db, 'userCarts', userLegajo);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data.quantities || {});
    } else {
      callback({});
    }
  });
}

export async function saveUserCartInCloud(
  userLegajo: string, 
  quantities: Record<string, number>, 
  order: OrderItem[]
): Promise<void> {
  await ensureAuthenticated();
  await setDoc(doc(db, 'userCarts', userLegajo), {
    quantities,
    order,
    updatedAt: new Date().toISOString()
  });
}

export async function clearUserCartInCloud(userLegajo: string): Promise<void> {
  await ensureAuthenticated();
  await setDoc(doc(db, 'userCarts', userLegajo), {
    quantities: {},
    order: [],
    updatedAt: new Date().toISOString()
  });
}
