const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const SEED_PATH = path.join(DATA_DIR, "seed.json");

if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.copyFileSync(SEED_PATH, DB_PATH);
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function activeOrders(db) {
  return db.orders.filter(o => !["Ready", "Collected", "Cancelled"].includes(o.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
function orderPrepMinutes(order, db) {
  return order.items.reduce((sum, item) => {
    const menuItem = db.menu.find(m => m.id === item.menuId);
    return sum + (menuItem ? menuItem.prepTime * item.quantity : 5 * item.quantity);
  }, 0);
}
function getQueueEstimate(db, targetOrder) {
  const queue = activeOrders(db);
  const index = queue.findIndex(o => o.id === targetOrder.id);
  if (index < 0) return 0;
  // A simple queue model: one preparation counter, with a 2-minute handover buffer.
  const minutes = queue.slice(0, index + 1).reduce((sum, order) => sum + orderPrepMinutes(order, db), 0);
  return Math.max(2, Math.ceil(minutes * 0.72));
}
function publicOrder(order, db) {
  const queue = activeOrders(db);
  const index = queue.findIndex(o => o.id === order.id);
  return {
    ...order,
    queuePosition: index < 0 ? 0 : index + 1,
    estimatedWait: getQueueEstimate(db, order)
  };
}

app.get("/api/health", (req, res) => res.json({ ok: true, service: "Canteen Queue Optimizer API" }));

app.get("/api/menu", (req, res) => {
  const db = readDB();
  res.json(db.menu);
});

app.post("/api/orders", (req, res) => {
  const { studentName, items } = req.body;
  if (!studentName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Please enter your name and select at least one item." });
  }
  const db = readDB();
  const normalized = [];
  for (const requested of items) {
    const menuItem = db.menu.find(m => m.id === Number(requested.menuId) && m.available);
    const quantity = Math.min(10, Math.max(1, Number(requested.quantity) || 1));
    if (!menuItem) return res.status(400).json({ error: "One of the selected items is unavailable." });
    normalized.push({ menuId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity, emoji: menuItem.emoji });
  }
  const total = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const id = db.nextOrderId++;
  const order = {
    id,
    token: `C${String(id).padStart(3, "0")}`,
    studentName: String(studentName).trim().slice(0, 40),
    items: normalized,
    total,
    status: "Received",
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  writeDB(db);
  res.status(201).json(publicOrder(order, db));
});

app.get("/api/orders", (req, res) => {
  const db = readDB();
  res.json([...db.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(order => publicOrder(order, db)));
});

app.get("/api/orders/:id", (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.token.toLowerCase() === String(req.params.id).toLowerCase());
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json(publicOrder(order, db));
});

app.patch("/api/orders/:id/status", (req, res) => {
  const allowed = ["Received", "Preparing", "Ready", "Collected", "Cancelled"];
  const db = readDB();
  const order = db.orders.find(o => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid order status." });
  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(publicOrder(order, db));
});

app.post("/api/menu", (req, res) => {
  const { name, category, price, prepTime, emoji } = req.body;
  if (!name || !Number(price) || Number(price) < 1) {
    return res.status(400).json({ error: "Enter a food name and a valid price." });
  }
  const db = readDB();
  const item = {
    id: Math.max(0, ...db.menu.map(m => m.id)) + 1,
    name: String(name).trim().slice(0, 50),
    category: category || "Snacks",
    price: Number(price),
    prepTime: Math.max(1, Number(prepTime) || 5),
    emoji: emoji || "🍽️",
    available: true
  };
  db.menu.push(item);
  writeDB(db);
  res.status(201).json(item);
});

app.patch("/api/menu/:id", (req, res) => {
  const db = readDB();
  const item = db.menu.find(m => m.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Menu item not found." });
  item.available = Boolean(req.body.available);
  writeDB(db);
  res.json(item);
});

app.get("/api/analytics", (req, res) => {
  const db = readDB();
  const today = new Date().toDateString();
  const todays = db.orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const active = activeOrders(db);
  const completed = todays.filter(o => ["Ready", "Collected"].includes(o.status));
  const revenue = todays.filter(o => o.status !== "Cancelled").reduce((s, o) => s + o.total, 0);
  const counts = {};
  todays.forEach(o => o.items.forEach(i => counts[i.name] = (counts[i.name] || 0) + i.quantity));
  const popular = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([name, quantity]) => ({ name, quantity }));
  res.json({
    todayOrders: todays.length,
    activeOrders: active.length,
    completedOrders: completed.length,
    revenue,
    averageQueueSize: active.length,
    popular,
    averageWait: active.length ? Math.round(active.reduce((s, o) => s + getQueueEstimate(db, o), 0) / active.length) : 0
  });
});

app.get("/api/ai-insights", async (req, res) => {
  const db = readDB();
  const active = activeOrders(db);
  const today = db.orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const productCounts = {};
  today.forEach(o => o.items.forEach(i => productCounts[i.name] = (productCounts[i.name] || 0) + i.quantity));
  const popular = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const metrics = {
    activeOrders: active.length,
    averageWait: active.length ? Math.round(active.reduce((s, o) => s + getQueueEstimate(db, o), 0) / active.length) : 0,
    popularItems: popular,
    menuSize: db.menu.filter(m => m.available).length
  };

  const fallback = [
    active.length >= 8 ? "High queue load: consider assigning a second preparation counter." :
      active.length >= 4 ? "Moderate queue: prepare frequently ordered ingredients in small batches." :
      "Queue is currently manageable. Keep one counter focused on quick-to-prepare drinks and snacks.",
    popular.length ? `Keep ingredients ready for ${popular[0][0]}${popular[1] ? " and " + popular[1][0] : ""}.` :
      "Collect a few more orders to identify the most popular menu items.",
    "Review item preparation times at the end of each lunch break to improve future wait estimates."
  ];

  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `You are an operations assistant for a college canteen. Based on these metrics, give 3 short, practical queue and inventory suggestions. Do not invent facts. Metrics: ${JSON.stringify(metrics)}. Return plain text with 3 numbered suggestions.`;
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (response.ok) {
        const data = await response.json();
        const generated = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n");
        if (generated) return res.json({ source: "Gemini AI", insights: generated.split("\n").filter(Boolean), metrics });
      }
    } catch (e) {
      console.error("Gemini request failed:", e.message);
    }
  }
  res.json({ source: "Built-in smart analysis", insights: fallback, metrics });
});

app.listen(PORT, () => console.log(`Canteen API running at http://localhost:${PORT}`));
