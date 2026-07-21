import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { Product, AppUser } from '../types';
import { ImportStatus } from '../components/NewProductManager';
import { mockProducts } from '../data/mockProducts';

// Firebase configuration matching the firebase-applet-config.json
const firebaseConfig = {
  projectId: "waking-inkwell-wdw25",
  appId: "1:794432509226:web:e495d712c77ce9c275fa53",
  apiKey: "AIzaSyBr3x-0evl_GptjfWjxannXOhvB5vNfFK8",
  authDomain: "waking-inkwell-wdw25.firebaseapp.com",
  storageBucket: "waking-inkwell-wdw25.firebasestorage.app",
  messagingSenderId: "794432509226",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the named database specified in configuration
export const db = getFirestore(
  app, 
  "ai-studio-maestroskuyabast-4ba1995b-2955-49e5-9cbb-38d9ed97f323"
);

/**
 * Sync products list in real-time from Firestore
 */
export function syncProducts(onUpdate: (products: Product[]) => void) {
  const productsCol = collection(db, 'products');
  return onSnapshot(productsCol, (snapshot) => {
    const list: Product[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Product);
    });
    // Sort products by supplier and description so the order is stable
    list.sort((a, b) => {
      const supComp = (a.proveedor || '').localeCompare(b.proveedor || '');
      if (supComp !== 0) return supComp;
      return (a.descripcion || '').localeCompare(b.descripcion || '');
    });
    onUpdate(list);
  }, (error) => {
    console.error("Error syncing products from Firestore:", error);
  });
}

/**
 * Sync users list in real-time from Firestore
 */
export function syncUsers(onUpdate: (users: AppUser[]) => void) {
  const usersCol = collection(db, 'users');
  return onSnapshot(usersCol, (snapshot) => {
    const list: AppUser[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AppUser);
    });
    onUpdate(list);
  }, (error) => {
    console.error("Error syncing users from Firestore:", error);
  });
}

/**
 * Sync import status metadata in real-time from Firestore
 */
export function syncImportStatus(onUpdate: (status: ImportStatus) => void) {
  const docRef = doc(db, 'config', 'importStatus');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as ImportStatus);
    }
  }, (error) => {
    console.error("Error syncing import status from Firestore:", error);
  });
}

/**
 * Save a single product to Firestore
 */
export async function saveProduct(product: Product): Promise<void> {
  const docRef = doc(db, 'products', product.codigoProducto);
  await setDoc(docRef, product);
}

/**
 * Delete a single product from Firestore
 */
export async function deleteProduct(codigoProducto: string): Promise<void> {
  const docRef = doc(db, 'products', codigoProducto);
  await deleteDoc(docRef);
}

/**
 * Bulk save products to Firestore using chunked batches (Firestore allows up to 500 writes per batch)
 */
export async function bulkSaveProducts(productsList: Product[], clearExisting: boolean): Promise<void> {
  // If clearExisting is true, we should delete existing products first
  if (clearExisting) {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const deletePromises: Promise<void>[] = [];
    
    // Chunk deletions into batches of 400
    const docs = querySnapshot.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 400);
      chunk.forEach((d) => batch.delete(d.ref));
      deletePromises.push(batch.commit());
    }
    await Promise.all(deletePromises);
  }

  // Save new/updated products in batches of 400
  const savePromises: Promise<void>[] = [];
  for (let i = 0; i < productsList.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = productsList.slice(i, i + 400);
    chunk.forEach((p) => {
      const docRef = doc(db, 'products', p.codigoProducto);
      batch.set(docRef, p);
    });
    savePromises.push(batch.commit());
  }
  await Promise.all(savePromises);
}

/**
 * Save a single user to Firestore
 */
export async function saveUser(user: AppUser): Promise<void> {
  const docRef = doc(db, 'users', user.legajo);
  await setDoc(docRef, user);
}

/**
 * Delete a single user from Firestore
 */
export async function deleteUser(legajo: string): Promise<void> {
  const docRef = doc(db, 'users', legajo);
  await deleteDoc(docRef);
}

/**
 * Save the import status metadata
 */
export async function saveImportStatus(status: ImportStatus): Promise<void> {
  const docRef = doc(db, 'config', 'importStatus');
  await setDoc(docRef, status);
}

/**
 * Sync manual products list in real-time from Firestore
 */
export function syncNewManualProducts(onUpdate: (products: Product[]) => void) {
  const manualCol = collection(db, 'new_manual_products');
  return onSnapshot(manualCol, (snapshot) => {
    const list: Product[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Product);
    });
    onUpdate(list);
  }, (error) => {
    console.error("Error syncing new manual products from Firestore:", error);
  });
}

/**
 * Save manual product
 */
export async function saveNewManualProduct(product: Product): Promise<void> {
  const docRef = doc(db, 'new_manual_products', product.codigoProducto);
  await setDoc(docRef, product);
}

/**
 * Delete manual product
 */
export async function deleteNewManualProduct(codigoProducto: string): Promise<void> {
  const docRef = doc(db, 'new_manual_products', codigoProducto);
  await deleteDoc(docRef);
}

/**
 * Clear manual products
 */
export async function clearNewManualProductsList(manualProducts: Product[]): Promise<void> {
  const batch = writeBatch(db);
  manualProducts.forEach((p) => {
    const docRef = doc(db, 'new_manual_products', p.codigoProducto);
    batch.delete(docRef);
  });
  await batch.commit();
}

/**
 * Sync active cart state in real-time per user
 */
export function syncUserCart(legajo: string, onUpdate: (cart: { savedQuantities: Record<string, number>; savedOrder: any[] }) => void) {
  const docRef = doc(db, 'carts', legajo);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onUpdate({
        savedQuantities: data.savedQuantities || {},
        savedOrder: data.savedOrder || []
      });
    } else {
      onUpdate({
        savedQuantities: {},
        savedOrder: []
      });
    }
  }, (error) => {
    console.error("Error syncing cart from Firestore:", error);
  });
}

/**
 * Save active cart state to Firestore for a user
 */
export async function saveUserCart(legajo: string, savedQuantities: Record<string, number>, savedOrder: any[]): Promise<void> {
  const docRef = doc(db, 'carts', legajo);
  await setDoc(docRef, {
    legajo,
    savedQuantities,
    savedOrder,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Seed initial mock products, default users, and initial import status if they do not exist
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    // 1. Seed products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    if (productsSnapshot.empty) {
      console.log("Seeding initial mock products into centralized Firestore...");
      await bulkSaveProducts(mockProducts, false);
    }

    // 2. Seed default users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      console.log("Seeding default users into centralized Firestore...");
      const defaultUsers: AppUser[] = [
        { nombre: "Administrador Depósito", legajo: "admin", clave: "admin", rol: "ADMIN" },
        { nombre: "Operador Turno Mañana", legajo: "1001", clave: "1234", rol: "USUARIO" }
      ];
      for (const user of defaultUsers) {
        await saveUser(user);
      }
    }

    // 3. Seed import status
    const configSnap = await getDoc(doc(db, 'config', 'importStatus'));
    if (!configSnap.exists()) {
      console.log("Seeding initial import status into centralized Firestore...");
      const initialProductCount = mockProducts.length;
      const initialCompraCount = mockProducts.reduce((sum, p) => sum + (p.compraTotal > 0 ? 1 : 0), 0);
      const initialVentaCount = mockProducts.reduce((sum, p) => sum + p.ventas.length, 0);

      const status: ImportStatus = {
        general: { loaded: true, fileName: 'Catalogo_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialProductCount },
        compra: { loaded: true, fileName: 'Compras_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialCompraCount },
        venta: { loaded: true, fileName: 'Ventas_Demo_Inicial.csv', date: '2025-12-10 14:00', count: initialVentaCount },
      };
      await saveImportStatus(status);
    }
  } catch (error) {
    console.error("Error seeding initial Firestore data:", error);
  }
}
