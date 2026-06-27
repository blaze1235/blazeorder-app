import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ScreenType, UserRole, Supplier, Product, CartItem, Order, OrderTemplate, Language, StaffMember, DeliveryZone, WorkingHours, AppNotification, Transaction } from './types';
import { SUPPLIERS, MOCK_TEMPLATES, MOCK_STAFF, MOCK_ZONES, MOCK_WORKING_HOURS, MOCK_TRANSACTIONS } from './constants';
import { translations } from './translations';
import {
  fetchProducts, fetchOrders, fetchOrdersBySupplier,
  fetchSupplierStats, SupplierStats,
  updateOrderStatus as apiUpdateStatus,
  updateProduct as apiUpdateProduct,
  addProduct as apiAddProduct,
  placeOrder as apiPlaceOrder,
  checkApiHealth,
  SheetOrder, SheetProduct, ClientProfile, AccountProfile,
} from './api';

import AuthScreen, { LoggedInUser } from './screens/AuthScreen';
import SupplierDashboard from './screens/SupplierDashboard';
import OwnerSuppliersScreen from './screens/OwnerSuppliersScreen';
import Home from './screens/Home';
import CreateOrder from './screens/CreateOrder';
import ProductList from './screens/ProductList';
import OrderReview from './screens/OrderReview';
import MyOrders from './screens/MyOrders';
import Wallet from './screens/Wallet';
import OrderDetail from './screens/OrderDetail';
import NotificationsScreen from './screens/NotificationsScreen';
import DistributorDashboard from './screens/DistributorDashboard';
import IncomingOrders from './screens/IncomingOrders';
import ProductManagement from './screens/ProductManagement';
import AnalyticsCenter from './screens/AnalyticsCenter';
import TeamSettings from './screens/TeamSettings';
import WorkingHoursScreen from './screens/WorkingHoursScreen';
import DeliveryZonesScreen from './screens/DeliveryZonesScreen';

type OwnerScreen =
  | 'dashboard' | 'orders' | 'products' | 'analytics'
  | 'staff' | 'suppliers' | 'notifications' | 'settings'
  | 'working-hours' | 'delivery-zones' | 'order-detail';

function mapStatus(s: string): Order['status'] {
  const m: Record<string, Order['status']> = {
    // Sheets → internal (case-insensitive)
    new:'pending', pending:'pending',
    accepted:'accepted',
    preparing:'accepted',   // collapse to accepted (4-step UI)
    ready:'accepted',       // collapse to accepted (4-step UI)
    sent:'picked_up', picked_up:'picked_up',
    delivered:'picked_up',  // collapse to picked_up (4-step UI)
    completed:'completed', cancelled:'cancelled',
  };
  return m[s.toLowerCase()] || 'pending';
}
function mapStatusToSheet(s: Order['status']): string {
  // internal → Sheets column value
  const m: Record<string,string> = {
    pending:'New', accepted:'Accepted', picked_up:'Sent',
    completed:'Completed', cancelled:'Cancelled',
  };
  return m[s] || s;
}
function sheetToOrder(o: SheetOrder): Order {
  return {
    id:o.id, date:o.date, status:mapStatus(o.status), total:o.total,
    supplierName:o.supplierName, buyerName:o.buyerName,
    items:o.items as CartItem[], timeline:o.timeline,
    isCreditPayment:o.paymentMethod==='credit',
    driverName:o.driverName||undefined, deliveryMethod:'own-courier',
  };
}

const App: React.FC = () => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<LoggedInUser | null>(() => {
    try { const s = localStorage.getItem('blazeorder_user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const handleLogout = useCallback(() => { localStorage.removeItem('blazeorder_user'); setUser(null); }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [apiOnline, setApiOnline]         = useState<boolean | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);  // only true on first load
  const [orders, setOrders]               = useState<Order[]>([]);
  const [products, setProducts]           = useState<Product[]>([]);
  const [language, setLanguage]           = useState<Language>(() => (localStorage.getItem('dora_lang') as Language)||'en');
  const [supplierStats, setSupplierStats] = useState<SupplierStats[]>([]);
  const [statsLoading, setStatsLoading]   = useState(false);
  const isFirstLoad = useRef(true);
  const t = useCallback((key: string) => translations[language]?.[key] || key, [language]);

  // ── Owner state ───────────────────────────────────────────────────────────
  const [ownerScreen, setOwnerScreen]     = useState<OwnerScreen>('dashboard');
  const [staff, setStaff]                 = useState<StaffMember[]>(MOCK_STAFF);
  const [zones, setZones]                 = useState<DeliveryZone[]>(MOCK_ZONES);
  const [workingHours, setWorkingHours]   = useState<WorkingHours[]>(MOCK_WORKING_HOURS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const addNotif = useCallback((msg: string, type: AppNotification['type']='info', oid?: string) => {
    setNotifications(p => [{ id:`N-${Date.now()}`, orderId:oid, type, message:msg, isRead:false, createdAt:new Date().toISOString() }, ...p]);
  }, []);

  // ── Client state ──────────────────────────────────────────────────────────
  const [clientScreen, setClientScreen]   = useState<ScreenType>('home');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [balance, setBalance]             = useState(1250);
  const [transactions, setTransactions]   = useState<Transaction[]>(MOCK_TRANSACTIONS);

  // ── Load data — silent background refresh ─────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!user) { setInitialLoading(false); return; }
    // Only show loading spinner on very first load
    if (!silent && isFirstLoad.current) setInitialLoading(true);

    try {
      const online = await checkApiHealth();
      setApiOnline(online);
      if (!online) { setInitialLoading(false); return; }

      const [sp, so] = await Promise.all([
        fetchProducts(),
        user.type === 'supplier'
          ? fetchOrdersBySupplier((user.profile as AccountProfile).linked_name)
          : fetchOrders(),
      ]);

      setProducts(sp.map((p: SheetProduct): Product => ({
        id:p.id, name:p.name, price:p.price, category:p.category, supplierId:p.supplierId,
        image:p.image, description:p.description, stockLevel:p.stockLevel,
        reservedStock:p.reservedStock, isActive:p.isActive,
        minOrderQty:p.minOrderQty, lowStockAlert:p.lowStockAlert,
      })));
      // Merge: never downgrade status; local state wins until Sheets catches up
      setOrders(prev => {
        const rank: Record<string,number> = {
          pending:0, accepted:1, picked_up:2, completed:3, cancelled:4
        };
        const fromSheets = so.map(sheetToOrder);
        const sheetMap   = new Map(fromSheets.map((o: Order) => [o.id, o]));
        const prevMap    = new Map(prev.map(o => [o.id, o]));
        // All ids from both sources
        const allIds     = new Set([...sheetMap.keys(), ...prevMap.keys()]);
        const merged: Order[] = [];
        allIds.forEach(id => {
          const sheet = sheetMap.get(id);
          const local = prevMap.get(id);
          if (!sheet) { merged.push(local!); return; }   // local-only (not synced yet)
          if (!local) { merged.push(sheet); return; }    // new from Sheets
          // Keep higher rank; if equal keep local (has fresher timeline)
          merged.push((rank[local.status]??0) >= (rank[sheet.status]??0)
            ? { ...sheet, status: local.status, timeline: local.timeline }
            : sheet);
        });
        return merged.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    } catch (e) {
      console.error('Load failed:', e);
      if (isFirstLoad.current) setApiOnline(false);
    } finally {
      setInitialLoading(false);
      isFirstLoad.current = false;
    }
  }, [user]);

  useEffect(() => { loadData(false); }, [loadData]);

  // Silent background refresh every 20s — never blocks UI
  useEffect(() => {
    const id = setInterval(() => loadData(true), 20_000);
    return () => clearInterval(id);
  }, [loadData]);

  // Load supplier stats only when owner opens Suppliers tab
  const loadSupplierStats = useCallback(async () => {
    if (user?.type !== 'owner' || !apiOnline) return;
    setStatsLoading(true);
    try { setSupplierStats(await fetchSupplierStats()); }
    catch (e) { console.error('Stats load failed:', e); }
    finally { setStatsLoading(false); }
  }, [user, apiOnline]);

  useEffect(() => { if (ownerScreen === 'suppliers') loadSupplierStats(); }, [ownerScreen]);
  useEffect(() => { localStorage.setItem('dora_lang', language); }, [language]);

  // ── Order status update ────────────────────────────────────────────────────
  const handleUpdateProduct = useCallback(async (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (apiOnline) {
      try { await apiUpdateProduct(updated.id, { name:updated.name, price:updated.price, stockLevel:updated.stockLevel, isActive:updated.isActive }); }
      catch (e) { console.error('Product sync failed:', e); }
    }
  }, [apiOnline]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: Order['status'], driver?: StaffMember, reason?: string) => {
    const ts = new Date().toISOString();
    setOrders(prev => prev.map(o => o.id !== orderId ? o : {
      ...o, status:newStatus, declineReason:reason, cancelReason:reason,
      driverId:driver?.id||o.driverId, driverName:driver?.name||o.driverName,
      timeline:[...o.timeline, { status:newStatus, time:ts, completed:true, author:'System' }]
    }));
    // Deduct stock when order is completed
    if (newStatus === 'completed') {
      setOrders(currentOrders => {
        const order = currentOrders.find(o => o.id === orderId);
        if (order) {
          setProducts(prev => prev.map(p => {
            const item = order.items.find(i => i.id === p.id);
            if (!item) return p;
            const newStock = Math.max(0, p.stockLevel - item.quantity);
            if (apiOnline) {
              apiUpdateProduct(p.id, { stockLevel: newStock }).catch(() => {});
            }
            return { ...p, stockLevel: newStock };
          }));
        }
        return currentOrders; // no change to orders here
      });
    }
    if (apiOnline) {
      try { await apiUpdateStatus(orderId, mapStatusToSheet(newStatus), driver?.name, reason); }
      catch (e) { console.error('Status sync failed:', e); }
    }
  }, [apiOnline, orders]);

  // ── Multi-supplier order placement ─────────────────────────────────────────
  // Splits cart by supplier, writes one order per supplier to Sheets
  // Set exact quantity in cart
  const handleSetQuantity = useCallback((id: string, qty: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  }, []);

  // Deduct stock from products when order is confirmed
  const handleConfirmOrder = useCallback(async (isCredit: boolean) => {
    const profile   = user?.profile as ClientProfile;
    const sessionId = `SESS-${Date.now()}`;
    const ts        = new Date().toISOString();
    const date      = ts.split('T')[0];

    // Group cart items by supplierId
    const bySupplier: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const key = item.supplierId || 'unknown';
      if (!bySupplier[key]) bySupplier[key] = [];
      bySupplier[key].push(item);
    });

    const newOrders: Order[] = [];

    for (const [supplierId, items] of Object.entries(bySupplier)) {
      const supplierTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const orderId       = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;

      newOrders.push({
        id: orderId, date, status: 'pending',
        total: supplierTotal,
        supplierName: supplierId,
        buyerName: profile?.name || 'Web User',
        clientChatId: profile?.chat_id || '',
        sessionId,
        items: items,
        isCreditPayment: isCredit,
        timeline: [{ status: 'Order Placed', time: ts, completed: true, author: 'Buyer' }],
      });

      // Write each supplier's order separately to Sheets
      if (apiOnline) {
        try {
          await apiPlaceOrder({
            id: orderId, date: ts,
            buyerName: profile?.name || 'Web User',
            clientChatId: profile?.chat_id || '',
            supplierName: supplierId,
            total: supplierTotal,
            isCreditPayment: isCredit,
            sessionId,
            items: items.map(i => ({ id:i.id, name:i.name, price:i.price, quantity:i.quantity })),
          });
        } catch (e) { console.error(`Order sync failed for ${supplierId}:`, e); }
      }
    }

    if (!isCredit) {
      const totalAll = newOrders.reduce((s, o) => s + o.total, 0);
      setBalance(b => b - totalAll);
    }
    setOrders(prev => [...newOrders, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setCart([]);
    setClientScreen('orders');
  }, [cart, user, apiOnline]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const c  = orders.filter(o => o.status === 'completed');
    const ih = products.length
      ? Math.round(products.filter(p => p.stockLevel > p.lowStockAlert).length / products.length * 100)
      : 100;
    return { revenue:c.reduce((s,o)=>s+o.total,0), growth:24.5, avgDeliveryTime:22, avgAssemblyTime:14, inventoryHealth:ih, totalCompleted:c.length };
  }, [orders, products]);

  // ── API banner — subtle, doesn't block anything ────────────────────────────
  const ApiBanner = () => apiOnline === false
    ? <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600/90 backdrop-blur text-white text-xs text-center py-1 font-bold">
        ⚠️ Cannot reach server — showing cached data
      </div>
    : null;

  if (!user) return <AuthScreen onAuthenticated={u => { localStorage.setItem('blazeorder_user', JSON.stringify(u)); setUser(u); }} />;

  // Only block UI on very first load
  if (initialLoading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-white flex-col gap-4">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
        <span className="text-3xl font-black text-indigo-600">B</span>
      </div>
      <p className="text-lg font-semibold">BlazeOrder</p>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // ── SUPPLIER ───────────────────────────────────────────────────────────────
  if (user.type === 'supplier') {
    const account    = user.profile as AccountProfile;
    const myProducts = products.filter(p => p.supplierId.toLowerCase() === account.linked_name.toLowerCase());
    return (
      <>
        <ApiBanner />
        <SupplierDashboard account={account} orders={orders} products={myProducts}
          onUpdateStatus={updateOrderStatus} onUpdateProduct={handleUpdateProduct}
          onLogout={handleLogout} t={t} apiOnline={!!apiOnline} />
      </>
    );
  }

  // ── OWNER ──────────────────────────────────────────────────────────────────
  if (user.type === 'owner') {
    const ownerRole: UserRole = 'distributor';
    const unread = notifications.filter(n => !n.isRead).length;

    const ownerNavItems = [
      { id:'dashboard'    as OwnerScreen, icon:'fa-chart-pie',      label:'Overview' },
      { id:'orders'       as OwnerScreen, icon:'fa-clipboard-list', label:'Orders',   badge: orders.filter(o=>o.status==='pending').length||undefined },
      { id:'suppliers'    as OwnerScreen, icon:'fa-boxes-stacked',  label:'Suppliers' },
      { id:'products'     as OwnerScreen, icon:'fa-tag',            label:'Products' },
      { id:'analytics'    as OwnerScreen, icon:'fa-chart-line',     label:'Analytics' },
      { id:'staff'        as OwnerScreen, icon:'fa-user-group',     label:'Staff' },
      { id:'notifications' as OwnerScreen, icon:'fa-bell',          label:'Alerts',   badge: unread||undefined },
      { id:'settings'     as OwnerScreen, icon:'fa-gear',           label:'Settings' },
    ];

    const renderOwner = () => {
      switch (ownerScreen) {
        case 'dashboard':    return <DistributorDashboard onNavigate={s=>setOwnerScreen(s as OwnerScreen)} t={t} notifications={notifications} role={ownerRole} staff={staff} orders={orders} products={products} onUpdateStatus={updateOrderStatus} onUpdateStaffStatus={(id,s)=>setStaff(p=>p.map(m=>m.id===id?{...m,status:s}:m))} stats={stats} />;
        case 'orders':       return <IncomingOrders orders={orders} onUpdateStatus={updateOrderStatus} onViewDetails={o=>{setSelectedOrder(o);setOwnerScreen('order-detail');}} t={t} role={ownerRole} staff={staff} />;
        case 'suppliers':    return <OwnerSuppliersScreen supplierStats={supplierStats} orders={orders} products={products} loading={statsLoading} />;
        case 'products':     return <ProductManagement products={products} onUpdateProduct={handleUpdateProduct} onAddProduct={async p=>{setProducts(prev=>[...prev,p]);if(apiOnline){try{await apiAddProduct({...p,supplier:p.supplierId});}catch{}}}} role={ownerRole} suppliers={[...new Set(products.map(p=>p.supplierId))]} />;
        case 'analytics':    return <AnalyticsCenter onBack={()=>setOwnerScreen('dashboard')} role={ownerRole} products={products} stats={stats} staff={staff} orders={orders} />;
        case 'staff':        return <TeamSettings team={staff} onUpdateTeam={setStaff} role={ownerRole} onRemoveStaff={id=>setStaff(p=>p.filter(s=>s.id!==id))} />;
        case 'notifications':return <NotificationsScreen notifications={notifications} t={t} role={ownerRole} onClear={()=>setNotifications([])} onMarkRead={id=>setNotifications(p=>p.map(n=>n.id===id?{...n,isRead:true}:n))} />;
        case 'order-detail': return <OrderDetail order={selectedOrder!} onBack={()=>setOwnerScreen('orders')} isDistributor onUpdateStatus={updateOrderStatus} onReorder={()=>{}} t={t} role={ownerRole} />;
        case 'working-hours':return <WorkingHoursScreen hours={workingHours} onUpdateHours={setWorkingHours} onBack={()=>setOwnerScreen('settings')} />;
        case 'delivery-zones':return <DeliveryZonesScreen zones={zones} onUpdateZones={setZones} onBack={()=>setOwnerScreen('settings')} />;
        case 'settings':     return (
          <div className="p-6 space-y-6 animate-fadeIn pb-24">
            <h2 className="text-2xl font-black">Settings</h2>
            <div className="space-y-3">
              {[{label:'Working Hours',icon:'fa-clock',screen:'working-hours' as OwnerScreen},{label:'Delivery Zones',icon:'fa-map-location-dot',screen:'delivery-zones' as OwnerScreen}].map(item=>(
                <button key={item.label} onClick={()=>setOwnerScreen(item.screen)} className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between hover:border-indigo-500/50 transition-all">
                  <div className="flex items-center space-x-4"><div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center"><i className={`fa-solid ${item.icon} text-indigo-400`}></i></div><span className="font-bold">{item.label}</span></div>
                  <i className="fa-solid fa-chevron-right text-slate-600"></i>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Language</label>
              <div className="flex space-x-2">{(['en','ru','uz'] as Language[]).map(l=><button key={l} onClick={()=>setLanguage(l)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${language===l?'bg-indigo-600 text-white':'bg-slate-800 text-slate-400'}`}>{l}</button>)}</div>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-amber-600/20 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-crown text-amber-400 text-xl"></i></div>
                <div><p className="font-black text-lg">{(user.profile as AccountProfile).linked_name}</p><p className="text-xs text-slate-500 uppercase font-bold">Owner · Full Access</p></div>
              </div>
              <button onClick={handleLogout} className="w-full bg-rose-500/10 border border-rose-500/20 py-4 rounded-2xl text-rose-400 font-black text-sm uppercase">
                <i className="fa-solid fa-right-from-bracket mr-2"></i>Sign Out
              </button>
            </div>
          </div>
        );
        default: return null;
      }
    };

    return (
      <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-white">
        <ApiBanner />
        <div className="hidden lg:flex flex-col w-64 h-full bg-slate-900 border-r border-slate-800 shrink-0">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg"><span className="text-xl font-black text-indigo-600">B</span></div>
              <div><h1 className="font-black text-lg">BlazeOrder</h1><p className="text-[9px] text-amber-400 font-black uppercase">Owner Panel</p></div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {ownerNavItems.map(item=>(
              <button key={item.id} onClick={()=>setOwnerScreen(item.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all relative ${ownerScreen===item.id?'bg-indigo-600 text-white shadow-lg':'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <i className={`fa-solid ${item.icon} w-5`}></i>
                <span className="font-bold text-sm">{item.label}</span>
                {item.badge && item.badge > 0 && <span className="absolute right-3 w-5 h-5 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">{item.badge}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-hide md:px-4">{renderOwner()}</main>
          <nav className="lg:hidden flex border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl">
            {ownerNavItems.slice(0,5).map(item=>(
              <button key={item.id} onClick={()=>setOwnerScreen(item.id)} className={`flex-1 flex flex-col items-center justify-center py-3 space-y-1 relative ${ownerScreen===item.id?'text-indigo-400':'text-slate-600'}`}>
                {item.badge && item.badge > 0 && <div className="absolute top-1.5 right-1/4 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">{item.badge}</div>}
                <i className={`fa-solid ${item.icon} text-base`}></i>
                <span className="text-[8px] font-black uppercase">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  // ── CLIENT ─────────────────────────────────────────────────────────────────
  const clientProfile = user.profile as ClientProfile;
  const myOrders = orders.filter(o => o.clientChatId === clientProfile?.chat_id || o.buyerName === clientProfile?.name);
  const renderClient = () => {
    switch (clientScreen) {
      case 'home':         return <Home onCreateOrder={()=>setClientScreen('create-order')} onViewOrders={()=>setClientScreen('orders')} onViewWallet={()=>setClientScreen('wallet')} onReorder={o=>{setCart(o.items);setClientScreen('order-review');}} onApplyTemplate={tmp=>{setCart(tmp.items);setClientScreen('order-review');}} lastOrder={orders.filter(o=>o.clientChatId===clientProfile?.chat_id)[0]} templates={MOCK_TEMPLATES} balance={balance} orders={orders} t={t} notifications={[]} onUpdateStatus={updateOrderStatus} currentUserId={clientProfile?.chat_id} />;
      case 'create-order': return <CreateOrder onSelectSupplier={s=>{setSelectedSupplier(s);setClientScreen('product-list');}} onBack={()=>setClientScreen('home')} t={t} />;
      case 'product-list': return <ProductList supplier={selectedSupplier!} products={products.filter(p=>p.supplierId.toLowerCase()===(selectedSupplier?.name||'').toLowerCase())} cart={cart} onAddToCart={(product,qty)=>setCart(prev=>{const ex=prev.find(i=>i.id===product.id);return ex?prev.map(i=>i.id===product.id?{...i,quantity:i.quantity+qty}:i):[...prev,{...product,quantity:qty}];})} onViewReview={()=>setClientScreen('order-review')} onBack={()=>setClientScreen('create-order')} t={t} />;
      case 'order-review': return <OrderReview cart={cart} onUpdateQuantity={(id,d)=>setCart(prev=>prev.map(i=>i.id===id?{...i,quantity:Math.max(1,i.quantity+d)}:i))} onSetQuantity={handleSetQuantity} onRemove={id=>setCart(prev=>prev.filter(i=>i.id!==id))} onConfirm={handleConfirmOrder} onBack={()=>setClientScreen('product-list')} t={t} />;
      case 'orders':       return <MyOrders orders={orders} onViewDetails={o=>{setSelectedOrder(o);setClientScreen('order-detail');}} onReorder={o=>{setCart(o.items);setClientScreen('order-review');}} onCreateOrder={()=>setClientScreen('create-order')} t={t} onUpdateStatus={updateOrderStatus} role="buyer" currentUserId={clientProfile?.chat_id} />;
      case 'order-detail': return <OrderDetail order={selectedOrder!} onBack={()=>setClientScreen('orders')} onReorder={o=>{setCart(o.items);setClientScreen('order-review');}} onUpdateStatus={updateOrderStatus} t={t} role="buyer" sessionOrders={selectedOrder?.sessionId ? orders.filter(o=>o.sessionId===selectedOrder.sessionId) : [selectedOrder!]} />;
      case 'wallet':       return <Wallet balance={balance} onTopUp={amt=>{setBalance(b=>b+amt);setTransactions(p=>[{id:`TX-${Date.now()}`,date:new Date().toLocaleString(),amount:amt,type:'top-up',status:'completed'},...p]);}} onWithdraw={amt=>{if(balance>=amt){setBalance(b=>b-amt);setTransactions(p=>[{id:`TX-${Date.now()}`,date:new Date().toLocaleString(),amount:-amt,type:'withdraw',status:'completed'},...p]);return true;}return false;}} transactions={transactions} t={t} />;
      case 'profile':      return (
        <div className="p-6 space-y-6 animate-fadeIn">
          <h2 className="text-2xl font-black">My Account</h2>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-user text-indigo-400 text-xl"></i></div>
              <div><p className="font-black text-lg">{clientProfile.name}</p><p className="text-xs text-slate-500">{clientProfile.institution}</p><p className="text-xs text-slate-600">{clientProfile.phone}</p></div>
            </div>
            <div className="border-t border-slate-800 pt-3"><p className="text-[10px] font-black text-slate-500 uppercase">Client ID</p><p className="text-sm font-bold text-indigo-400">{clientProfile.client_id}</p></div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Language</label>
            <div className="flex space-x-2">{(['en','ru','uz'] as Language[]).map(l=><button key={l} onClick={()=>setLanguage(l)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${language===l?'bg-indigo-600 text-white':'bg-slate-800 text-slate-400'}`}>{l}</button>)}</div>
          </div>
          <button onClick={handleLogout} className="w-full bg-rose-500/10 border border-rose-500/20 py-4 rounded-2xl text-rose-400 font-black text-sm uppercase">
            <i className="fa-solid fa-right-from-bracket mr-2"></i>Sign Out
          </button>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 overflow-hidden text-white">
      <ApiBanner />
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-20">{renderClient()}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 flex">
        {[{id:'home' as ScreenType,icon:'fa-house',label:'Home'},{id:'orders' as ScreenType,icon:'fa-box-open',label:'Orders'},{id:'wallet' as ScreenType,icon:'fa-wallet',label:'Wallet'},{id:'profile' as ScreenType,icon:'fa-user',label:'Account'}].map(tab=>(
          <button key={tab.id} onClick={()=>setClientScreen(tab.id)} className={`flex-1 flex flex-col items-center justify-center py-3 space-y-1 transition-all ${clientScreen===tab.id?'text-indigo-400':'text-slate-600'}`}>
            <i className={`fa-solid ${tab.icon} text-lg`}></i>
            <span className="text-[9px] font-black uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
