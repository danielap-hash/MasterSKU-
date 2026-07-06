import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set up JSON payload parser with large limit for images and large datasets
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  const STORE_PATH = path.join(process.cwd(), 'data-store.json');

  // Load server-side store
  let serverStore: {
    products?: any[];
    newManualProducts?: any[];
    users?: any[];
    importStatus?: any;
    carts?: Record<string, any>;
  } = {};

  if (fs.existsSync(STORE_PATH)) {
    try {
      serverStore = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      console.log("Loaded data store from disk.");
    } catch (e) {
      console.error("Error reading data store from disk, starting empty:", e);
    }
  }

  // API endpoints
  app.get("/api/sync", (req, res) => {
    const hasData = serverStore && Object.keys(serverStore).length > 0 && (
      (serverStore.products && serverStore.products.length > 0) ||
      (serverStore.newManualProducts && serverStore.newManualProducts.length > 0) ||
      (serverStore.users && serverStore.users.length > 0)
    );
    res.json({
      hasData,
      data: serverStore
    });
  });

  app.post("/api/sync", (req, res) => {
    const { products, newManualProducts, users, importStatus, carts } = req.body;
    
    if (products !== undefined) serverStore.products = products;
    if (newManualProducts !== undefined) serverStore.newManualProducts = newManualProducts;
    if (users !== undefined) serverStore.users = users;
    if (importStatus !== undefined) serverStore.importStatus = importStatus;
    if (carts !== undefined) {
      if (!serverStore.carts) {
        serverStore.carts = {};
      }
      serverStore.carts = {
        ...serverStore.carts,
        ...carts
      };
    }

    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(serverStore, null, 2), 'utf8');
    } catch (e) {
      console.error("Error writing data store to disk:", e);
    }

    res.json({ success: true, data: serverStore });
  });

  // Serve static or use Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
