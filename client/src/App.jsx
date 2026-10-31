import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bell, Check, ChefHat, Clock3, Coffee, LayoutDashboard,
  ListOrdered, Plus, Search, ShoppingBag, Sparkles, TrendingUp, Utensils,
  Wallet, X, RefreshCw, PackageCheck
} from "lucide-react";

const money = n => `₹${Number(n || 0).toFixed(0)}`;
const statuses = ["Received", "Preparing", "Ready", "Collected", "Cancelled"];

export default function App() {
  const [tab, setTab] = useState("order");
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [insights, setInsights] = useState(null);
  const [cart, setCart] = useState({});
  const [studentName, setStudentName] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [trackingToken, setTrackingToken] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Snacks", price: "", prepTime: 5, emoji: "🍽️" });

  const load = async () => {
    try {
      const [m, o, a, ai] = await Promise.all([
        fetch("/api/menu").then(r => r.json()),
        fetch("/api/orders").then(r => r.json()),
        fetch("/api/analytics").then(r => r.json()),
        fetch("/api/ai-insights").then(r => r.json())
      ]);
      setMenu(m); setOrders(o); setAnalytics(a); setInsights(ai);
      if (trackingToken) {
        const found = o.find(x => x.token.toLowerCase() === trackingToken.toLowerCase());
        if (found) setTrackedOrder(found);
      }
    } catch { setNotice("Could not connect to server. Start the backend and refresh."); }
  };

  useEffect(() => { load(); const timer = setInterval(load, 7000); return () => clearInterval(timer); }, []);
  const categories = ["All", ...new Set(menu.map(m => m.category))];
  const visibleMenu = useMemo(() => menu.filter(m => m.available &&
    (category === "All" || m.category === category) &&
    m.name.toLowerCase().includes(search.toLowerCase())), [menu, category, search]);
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const total = cartItems.reduce((sum, [id, q]) => {
    const item = menu.find(m => m.id === Number(id));
    return sum + (item ? item.price * q : 0);
  }, 0);

  const add = id => setCart(old => ({ ...old, [id]: Math.min(10, (old[id] || 0) + 1) }));
  const subtract = id => setCart(old => ({ ...old, [id]: Math.max(0, (old[id] || 0) - 1) }));

  const placeOrder = async () => {
    if (!studentName.trim() || !cartItems.length) return setNotice("Enter your name and add at least one item.");
    setBusy(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, items: cartItems.map(([menuId, quantity]) => ({ menuId: Number(menuId), quantity })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTrackingToken(data.token); setTrackedOrder(data); setCart({}); setStudentName("");
      setNotice(`Order placed! Your token is ${data.token}.`);
      setTab("track"); await load();
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  };

  const track = async () => {
    if (!trackingToken.trim()) return setNotice("Enter your order token first.");
    const r = await fetch(`/api/orders/${encodeURIComponent(trackingToken.trim())}`);
    const data = await r.json();
    if (!r.ok) { setTrackedOrder(null); return setNotice(data.error); }
    setTrackedOrder(data); setNotice("");
  };

  const updateStatus = async (id, status) => {
    const r = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    const data = await r.json();
    if (!r.ok) setNotice(data.error); else { setNotice(`Order ${data.token} updated.`); await load(); }
  };

  const toggleMenu = async (id, available) => {
    await fetch(`/api/menu/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available }) });
    await load();
  };

  const addMenuItem = async e => {
    e.preventDefault();
    const r = await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newItem) });
    const data = await r.json();
    if (!r.ok) return setNotice(data.error);
    setNewItem({ name: "", category: "Snacks", price: "", prepTime: 5, emoji: "🍽️" });
    setNotice(`${data.name} added to the menu.`); await load();
  };

  const nav = [
    ["order", ShoppingBag, "Order food"], ["track", Clock3, "Track order"],
    ["admin", LayoutDashboard, "Admin dashboard"]
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Utensils size={22}/></div><div><b>CampusBite</b><small>QUEUE OPTIMIZER</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{nav.map(([id, Icon, label]) => <button key={id} className={tab === id ? "nav-item active" : "nav-item"} onClick={() => { setTab(id); setNotice(""); }}><Icon size={18}/><span>{label}</span>{id === "admin" && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={17}/></div><b>Smarter campus dining</b><p>Less waiting. More eating. Your break, optimized.</p></div><small className="version">CAMPUSBITE • DEMO V1.0</small></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="mobile-brand"><Utensils size={19}/> CampusBite</div><div className="breadcrumb">Workspace <span>/</span> {nav.find(n => n[0] === tab)?.[2]}</div><div className="top-right"><span className="live-dot"/> System operational <button className="icon-button" onClick={load} title="Refresh"><RefreshCw size={17}/></button><div className="avatar">CB</div></div></header>
      <div className="content">
        {notice && <div className="toast"><span>{notice}</span><button onClick={() => setNotice("")}><X size={16}/></button></div>}

        {tab === "order" && <>
          <div className="page-heading"><div><div className="eyebrow">GOOD FOOD, LESS WAITING</div><h1>What are you craving?</h1><p>Order ahead and spend your break doing what you love.</p></div><div className="heading-art">🍱</div></div>
          <div className="student-stats">
            <div className="mini-stat"><div className="stat-icon purple"><Clock3/></div><div><small>LIVE QUEUE</small><b>{analytics.activeOrders ?? 0} orders</b></div></div>
            <div className="mini-stat"><div className="stat-icon orange"><TrendingUp/></div><div><small>AVG. WAIT</small><b>{analytics.averageWait ?? 0} min</b></div></div>
            <div className="mini-stat"><div className="stat-icon green"><PackageCheck/></div><div><small>ORDER AHEAD</small><b>Skip the line</b></div></div>
          </div>
          <div className="section-top"><div><h2>Explore menu</h2><p>Freshly prepared at the campus canteen</p></div><div className="searchbox"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search food..."/></div></div>
          <div className="chips">{categories.map(c => <button key={c} className={category === c ? "chip selected" : "chip"} onClick={() => setCategory(c)}>{c}</button>)}</div>
          <div className="order-layout">
            <div className="menu-grid">{visibleMenu.map(item => <div className="food-card" key={item.id}><div className="food-emoji">{item.emoji}</div><div className="food-info"><span className="food-category">{item.category}</span><h3>{item.name}</h3><div className="food-meta"><b>{money(item.price)}</b><span><Clock3 size={13}/> {item.prepTime} min prep</span></div></div><div className="food-action">{(cart[item.id] || 0) === 0 ? <button className="add-button" onClick={() => add(item.id)}><Plus size={16}/> Add</button> : <div className="quantity"><button onClick={() => subtract(item.id)}>−</button><b>{cart[item.id]}</b><button onClick={() => add(item.id)}>+</button></div>}</div></div>)}
              {!visibleMenu.length && <div className="empty">No menu items found. Try another search.</div>}
            </div>
            <div className="cart-card"><div className="cart-title"><div><h3>Your order</h3><small>{cartItems.reduce((s, [, q]) => s + q, 0)} items selected</small></div><div className="cart-icon"><ShoppingBag size={18}/></div></div>
              {cartItems.length ? <div className="cart-lines">{cartItems.map(([id, q]) => { const item = menu.find(m => m.id === Number(id)); return item && <div className="cart-line" key={id}><span>{item.emoji} {item.name} <small>× {q}</small></span><b>{money(item.price * q)}</b></div>; })}</div> : <div className="cart-empty"><span>🛍️</span><b>Your cart is empty</b><small>Add something delicious!</small></div>}
              <div className="cart-total"><span>Subtotal</span><b>{money(total)}</b></div><label className="field-label">YOUR NAME</label><input className="text-input" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Enter your name"/>
              <button className="primary-button full" disabled={!cartItems.length || busy} onClick={placeOrder}>{busy ? "Placing order..." : <>Place order <ArrowRight size={17}/></>}</button><div className="secure-note"><Check size={13}/> No payment required for demo</div>
            </div>
          </div>
        </>}

        {tab === "track" && <>
          <div className="page-heading"><div><div className="eyebrow">REAL-TIME ORDER STATUS</div><h1>Track your order</h1><p>Know exactly where your food is in the queue.</p></div><div className="heading-art">🛵</div></div>
          <div className="track-search"><div><label className="field-label">ORDER TOKEN</label><div className="track-input"><input value={trackingToken} onChange={e => setTrackingToken(e.target.value)} placeholder="e.g. C001" onKeyDown={e => e.key === "Enter" && track()}/><button className="primary-button" onClick={track}>Track order <ArrowRight size={16}/></button></div></div></div>
          {trackedOrder ? <div className="track-card"><div className="track-card-head"><div><span className="eyebrow">ORDER CONFIRMATION</span><h2>{trackedOrder.token}</h2><p>Placed by {trackedOrder.studentName}</p></div><span className={`status-pill ${trackedOrder.status.toLowerCase()}`}>{trackedOrder.status}</span></div><div className="eta-panel"><div className="eta-icon"><Clock3 size={23}/></div><div><small>ESTIMATED WAITING TIME</small><strong>{trackedOrder.status === "Ready" || trackedOrder.status === "Collected" ? "Ready!" : `${trackedOrder.estimatedWait} min`}</strong><span>{trackedOrder.queuePosition ? `Queue position #${trackedOrder.queuePosition}` : "No longer in active queue"}</span></div></div><div className="progress-steps">{["Received", "Preparing", "Ready", "Collected"].map((s, i) => { const current = ["Received", "Preparing", "Ready", "Collected"].indexOf(trackedOrder.status); return <div className={`progress-step ${current >= i ? "done" : ""}`} key={s}><div className="step-circle">{current >= i ? <Check size={14}/> : i + 1}</div><span>{s}</span></div>; })}</div><div className="track-items"><h3>Order summary</h3>{trackedOrder.items.map((i, n) => <div className="cart-line" key={n}><span>{i.emoji} {i.name} <small>× {i.quantity}</small></span><b>{money(i.price * i.quantity)}</b></div>)}<div className="cart-total"><span>Total</span><b>{money(trackedOrder.total)}</b></div></div></div> : <div className="track-placeholder"><div>🔎</div><h3>Your order details will appear here</h3><p>Place an order or enter the token from your confirmation.</p></div>}
        </>}

        {tab === "admin" && <>
          <div className="page-heading"><div><div className="eyebrow">CANTEEN CONTROL CENTER</div><h1>Admin dashboard</h1><p>Manage orders, optimize operations and keep the queue moving.</p></div><div className="admin-tag"><span className="live-dot"/> LIVE OVERVIEW</div></div>
          <div className="kpi-grid">
            <Kpi icon={ListOrdered} label="TODAY'S ORDERS" value={analytics.todayOrders ?? 0} tone="purple"/>
            <Kpi icon={Activity} label="ACTIVE QUEUE" value={analytics.activeOrders ?? 0} tone="orange"/>
            <Kpi icon={Wallet} label="TODAY'S SALES" value={money(analytics.revenue)} tone="green"/>
            <Kpi icon={Clock3} label="AVG. WAIT TIME" value={`${analytics.averageWait ?? 0} min`} tone="blue"/>
          </div>
          <div className="admin-grid">
            <section className="panel orders-panel"><div className="panel-heading"><div><h2>Incoming orders</h2><p>Update each order as it moves through the kitchen.</p></div><span className="count-badge">{orders.filter(o => !["Collected", "Cancelled"].includes(o.status)).length} active</span></div>
              <div className="table-wrap"><table><thead><tr><th>TOKEN / STUDENT</th><th>ORDER</th><th>WAIT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{orders.length ? orders.map(o => <tr key={o.id}><td><b className="token">{o.token}</b><small className="sub-cell">{o.studentName}</small></td><td><span className="order-desc">{o.items.map(i => `${i.name} ×${i.quantity}`).join(", ")}</span><small className="sub-cell">{money(o.total)}</small></td><td>{o.estimatedWait} min</td><td><span className={`status-pill ${o.status.toLowerCase()}`}>{o.status}</span></td><td><select className="status-select" value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></td></tr>) : <tr><td colSpan="5" className="empty-cell">No orders yet. New student orders will show here.</td></tr>}</tbody></table></div>
            </section>
            <section className="panel ai-panel"><div className="ai-heading"><div className="ai-spark"><Sparkles size={18}/></div><div><h2>AI canteen assistant</h2><p>Operational suggestions based on live data</p></div></div><span className="ai-source">{insights?.source || "Analyzing..."}</span><div className="insight-list">{(insights?.insights || ["Analyzing current queue..."]).map((s, i) => <div className="insight" key={i}><span>{String(i + 1).padStart(2, "0")}</span><p>{s.replace(/^\d+[\.\)]\s*/, "")}</p></div>)}</div><button className="text-button" onClick={load}>Refresh insights <RefreshCw size={14}/></button></section>
          </div>
          <section className="panel menu-admin"><div className="panel-heading"><div><h2>Menu management</h2><p>Add menu items or temporarily mark items unavailable.</p></div></div><form className="add-menu-form" onSubmit={addMenuItem}><input required placeholder="Food item name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}/><select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}><option>Snacks</option><option>Drinks</option><option>Meals</option></select><input required type="number" min="1" placeholder="Price ₹" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})}/><input type="number" min="1" placeholder="Prep min" value={newItem.prepTime} onChange={e => setNewItem({...newItem, prepTime: e.target.value})}/><button className="primary-button"><Plus size={15}/> Add item</button></form><div className="manage-menu-list">{menu.map(m => <div className="manage-menu-item" key={m.id}><span className="manage-emoji">{m.emoji}</span><div><b>{m.name}</b><small>{m.category} · {money(m.price)} · {m.prepTime} min prep</small></div><label className="switch"><input type="checkbox" checked={m.available} onChange={e => toggleMenu(m.id, e.target.checked)}/><span/></label></div>)}</div></section>
          <section className="panel popular-panel"><div className="panel-heading"><div><h2>Popular items today</h2><p>Use demand to plan ingredient preparation.</p></div></div>{analytics.popular?.length ? <div className="popular-list">{analytics.popular.map((p, i) => <div className="popular-row" key={p.name}><span className="rank">0{i + 1}</span><b>{p.name}</b><div className="bar-track"><div className="bar-fill" style={{width: `${Math.max(8, p.quantity / analytics.popular[0].quantity * 100)}%`}}/></div><span>{p.quantity} sold</span></div>)}</div> : <p className="muted">Popular item insights will appear after orders are placed.</p>}</section>
        </>}
      </div>
      <footer>© 2026 CampusBite <span>Built to make campus breaks better.</span></footer>
    </main>
  </div>;
}

function Kpi({ icon: Icon, label, value, tone }) {
  return <div className="kpi-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div><small>{label}</small><strong>{value}</strong></div></div>;
}
