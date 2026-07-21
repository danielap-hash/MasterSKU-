import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "waking-inkwell-wdw25",
  appId: "1:794432509226:web:e495d712c77ce9c275fa53",
  apiKey: "AIzaSyBr3x-0evl_GptjfWjxannXOhvB5vNfFK8",
  authDomain: "waking-inkwell-wdw25.firebaseapp.com",
  storageBucket: "waking-inkwell-wdw25.firebasestorage.app",
  messagingSenderId: "794432509226",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-maestroskuyabast-4ba1995b-2955-49e5-9cbb-38d9ed97f323");

async function main() {
  const docSnap = await getDoc(doc(db, 'products', '9018558'));
  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log("9018558 FOUND:", {
      codigoProducto: data.codigoProducto,
      descripcion: data.descripcion,
      compraTotal: data.compraTotal,
      ventaTotal: data.ventaTotal,
      fechaPrimeraVenta: data.fechaPrimeraVenta,
      fechaUltimaVenta: data.fechaUltimaVenta,
      ventasCount: data.ventas ? data.ventas.length : 0,
      ventasBreakdown: data.ventasBreakdown
    });
  } else {
    console.log("9018558 NOT FOUND IN FIRESTORE");
  }
  process.exit(0);
}

main().catch(console.error);
