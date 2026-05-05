'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  getOrders, updateOrderStatus, getMenuData, addProduct, editProduct, deleteProduct,
  formatCurrency, formatTime, playNotificationSound, markAllDelivered,
  type MenuItem, type Order,
} from '@/lib/store';
import { ADMIN_USER, ADMIN_PASS, CAT_LABELS } from '@/lib/constants';
import { HOTEL_COORDS, QR_CONFIG, clearConfigCache } from '@/lib/config';
import { getActiveSessions, type QRSession } from '@/lib/session';
import { fetchHotelSettings, adminAction } from '@/lib/supabase';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Dashboard state
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('all');
  const [lastOrderCount, setLastOrderCount] = useState(0);

  // Sessions state
  const [sessions, setSessions] = useState<QRSession[]>([]);

  // Product modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('starters');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImg, setProdImg] = useState('');
  const [prodIsVeg, setProdIsVeg] = useState(true);

  // Revenue
  const [revPeriod, setRevPeriod] = useState(7);

  // ── GPS & QR Generator State ──
  const [gpsLat, setGpsLat] = useState(HOTEL_COORDS.lat.toString());
  const [gpsLng, setGpsLng] = useState(HOTEL_COORDS.lng.toString());
  const [gpsRadius, setGpsRadius] = useState('50');
  const [gpsRoomRadius, setGpsRoomRadius] = useState('200');
  const [gpsStatus, setGpsStatus] = useState('');
  const [gpsCapturing, setGpsCapturing] = useState(false);
  const [gpsSaving, setGpsSaving] = useState(false);
  const [gpsSaveStatus, setGpsSaveStatus] = useState('');
  const [qrType, setQrType] = useState('table');
  const [qrNumber, setQrNumber] = useState('1');
  const [showQrResult, setShowQrResult] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrTimestamp, setQrTimestamp] = useState(0);
  const [bulkTimestamp, setBulkTimestamp] = useState(0);
  const [bulkType, setBulkType] = useState('table');
  const [bulkCount, setBulkCount] = useState('10');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkTokens, setBulkTokens] = useState<string[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'gps-qr'>('dashboard');
  const qrRef = useRef<HTMLDivElement>(null);

  // Load saved settings from DB
  const loadSettings = useCallback(async () => {
    const settings = await fetchHotelSettings();
    if (settings) {
      setGpsLat(settings.hotel_lat.toString());
      setGpsLng(settings.hotel_lng.toString());
      setGpsRadius(settings.table_radius_meters.toString());
      setGpsRoomRadius(settings.room_radius_meters.toString());
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('lanature_admin') === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // Load settings when admin logs in
  useEffect(() => {
    if (isLoggedIn) loadSettings();
  }, [isLoggedIn, loadSettings]);

  const refreshData = useCallback(async () => {
    const allOrders = await getOrders();
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter(o => new Date(o.time).toDateString() === today);
    
    if (todayOrders.length > lastOrderCount && lastOrderCount > 0) {
      playNotificationSound();
    }
    setLastOrderCount(todayOrders.length);
    setOrders(allOrders);

    const menuItems = await getMenuData();
    setProducts(menuItems);

    await adminAction('clean_expired_sessions');
    const activeSessions = await getActiveSessions();
    setSessions(activeSessions);
  }, [lastOrderCount]);

  useEffect(() => {
    if (!isLoggedIn) return;
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refreshData]);

  const doLogin = () => {
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      sessionStorage.setItem('lanature_admin', 'true');
      // Save credentials for edge function auth
      sessionStorage.setItem('lanature_admin_creds', JSON.stringify({ user: username, pass: password }));
      setIsLoggedIn(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  // ── GPS Capture with IP fallback ──
  const captureGPS = async () => {
    setGpsCapturing(true);
    setGpsStatus('');

    // Try browser GPS first
    const tryBrowserGPS = (): Promise<boolean> => new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(false); return; }
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsLat(pos.coords.latitude.toFixed(6));
          setGpsLng(pos.coords.longitude.toFixed(6));
          setGpsStatus(`success:✅ GPS Location captured! Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)} (Accuracy: ~${Math.round(pos.coords.accuracy)}m)`);
          resolve(true);
        },
        () => resolve(false),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

    const gpsSuccess = await tryBrowserGPS();
    if (gpsSuccess) { setGpsCapturing(false); return; }

    // Fallback: IP-based geolocation
    setGpsStatus('');
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setGpsLat(data.latitude.toString());
          setGpsLng(data.longitude.toString());
          setGpsStatus(`success:📡 IP-based location captured! Lat: ${data.latitude}, Lng: ${data.longitude} (City: ${data.city || 'Unknown'}). Approximate location — adjust if needed.`);
          setGpsCapturing(false);
          return;
        }
      }
    } catch { /* IP fallback failed, try another */ }

    // Fallback 2: Another IP geolocation service
    try {
      const res2 = await fetch('https://ip-api.com/json/?fields=lat,lon,city,status');
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.status === 'success' && data2.lat && data2.lon) {
          setGpsLat(data2.lat.toString());
          setGpsLng(data2.lon.toString());
          setGpsStatus(`success:📡 IP-based location captured! Lat: ${data2.lat}, Lng: ${data2.lon} (City: ${data2.city || 'Unknown'}). Approximate location — adjust if needed.`);
          setGpsCapturing(false);
          return;
        }
      }
    } catch { /* both fallbacks failed */ }

    // All methods failed — use saved hotel coordinates
    setGpsStatus(`success:📍 Using saved hotel coordinates: Lat: ${HOTEL_COORDS.lat}, Lng: ${HOTEL_COORDS.lng}. Aap manually update kar sakte hain.`);
    setGpsLat(HOTEL_COORDS.lat.toString());
    setGpsLng(HOTEL_COORDS.lng.toString());
    setGpsCapturing(false);
  };

  // ── QR Helpers ──
  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  };

  const generateQR = () => {
    // Generate cryptographically strong token
    const token = crypto.randomUUID ? crypto.randomUUID() : 
      'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
    setQrToken(token);
    setQrTimestamp(Date.now());
    setShowQrResult(true);
  };

  const getQRUrl = (type: string, num: string, token: string, ts: number) => {
    return `${getBaseUrl()}/order?type=${type}&id=${num}&token=${token}&t=${ts}`;
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `LaNature_QR_${qrType}_${qrNumber}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const printQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const lbl = (qrType === 'table' ? 'Table ' : 'Room ') + qrNumber;
    const imgData = canvas.toDataURL();
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`<html><head><title>QR - ${lbl}</title><style>body{font-family:'Segoe UI',sans-serif;text-align:center;padding:40px;}h1{font-size:2rem;margin-bottom:4px;}h2{color:#666;font-size:1rem;margin-bottom:20px;}img{margin:0 auto;}p{color:#999;font-size:0.8rem;margin-top:16px;}.badge{display:inline-block;background:#2D5016;color:white;padding:4px 12px;border-radius:20px;font-size:0.75rem;margin-top:8px;}</style></head><body><h1>LaNature Hotel</h1><h2>${lbl}</h2><img src="${imgData}" width="250"><p>Scan to view menu & order food</p><div class="badge">🔒 GPS Secured</div><script>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  };

  const bulkGenerate = () => {
    const count = Math.min(parseInt(bulkCount) || 5, 20);
    const tokens: string[] = [];
    for (let i = 0; i < count; i++) {
      tokens.push(crypto.randomUUID ? crypto.randomUUID() :
        'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)));
    }
    setBulkTokens(tokens);
    setBulkTimestamp(Date.now());
    setShowBulk(true);
  };

  const printBulk = () => {
    const count = Math.min(parseInt(bulkCount) || 5, 20);
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    let items = '';
    for (let i = 1; i <= count; i++) {
      const canvas = document.querySelector(`#bulk-qr-${i} canvas`) as HTMLCanvasElement;
      const imgData = canvas ? canvas.toDataURL() : '';
      const lbl = (bulkType === 'table' ? 'Table ' : 'Room ') + i;
      items += `<div style="text-align:center;padding:20px;break-inside:avoid;"><h3>${lbl}</h3><img src="${imgData}" width="160"><p style="color:#999;font-size:0.7rem;margin-top:8px;">Scan to order • 🔒 GPS Secured</p></div>`;
    }
    printWin.document.write(`<html><head><title>LaNature QR Codes</title><style>body{font-family:'Segoe UI',sans-serif;padding:20px;}h1{text-align:center;margin-bottom:20px;}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}</style></head><body><h1>LaNature Hotel — QR Codes (GPS Secured)</h1><div class="grid">${items}</div><script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  };

  const doLogout = () => {
    sessionStorage.removeItem('lanature_admin');
    sessionStorage.removeItem('lanature_admin_creds');
    setIsLoggedIn(false);
  };

  // ── Order helpers ──
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.time).toDateString() === today);
  const totalOrders = todayOrders.length;
  const pendingOrders = todayOrders.filter(o => o.status !== 'delivered').length;
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);

  const changeStatus = async (orderId: number, status: Order['status']) => {
    await updateOrderStatus(orderId, status);
    await refreshData();
  };

  const handleMarkAllDelivered = async () => {
    await markAllDelivered();
    await refreshData();
  };

  // ── Product helpers ──
  const filteredProducts = products
    .filter(p => prodCatFilter === 'all' || p.category === prodCatFilter)
    .filter(p => !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.desc.toLowerCase().includes(prodSearch.toLowerCase()));

  const openModal = (product?: MenuItem) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name);
      setProdCategory(product.category);
      setProdPrice(product.price.toString());
      setProdDesc(product.desc);
      setProdImg(product.img);
      setProdIsVeg(product.veg);
    } else {
      setEditingProduct(null);
      setProdName(''); setProdCategory('starters'); setProdPrice('');
      setProdDesc(''); setProdImg(''); setProdIsVeg(true);
    }
    setModalOpen(true);
  };

  const saveProductHandler = async () => {
    if (!prodName.trim()) { alert('Product name is required!'); return; }
    if (!prodPrice || parseInt(prodPrice) <= 0) { alert('Valid price is required!'); return; }
    const data = {
      name: prodName.trim(),
      category: prodCategory as MenuItem['category'],
      price: parseInt(prodPrice),
      desc: prodDesc.trim(),
      img: prodImg.trim() || '/images/paneer-tikka.png',
      veg: prodIsVeg,
    };
    if (editingProduct) {
      await editProduct(editingProduct.id, data);
    } else {
      await addProduct(data);
    }
    setModalOpen(false);
    await refreshData();
  };

  const confirmDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteProduct(id);
      await refreshData();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file!'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB!'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setProdImg(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCloseSession = async (token: string) => {
    await adminAction('close_session', { token });
    await refreshData();
  };

  // ── Revenue helpers ──
  const getFilteredOrders = () => {
    if (revPeriod === 0) return orders;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - revPeriod);
    cutoff.setHours(0, 0, 0, 0);
    return orders.filter(o => new Date(o.time) >= cutoff);
  };

  const groupByDate = (ords: Order[]) => {
    const groups: Record<string, { date: string; orders: Order[]; revenue: number; online: number; cash: number }> = {};
    ords.forEach(o => {
      const key = new Date(o.time).toDateString();
      if (!groups[key]) groups[key] = { date: key, orders: [], revenue: 0, online: 0, cash: 0 };
      groups[key].orders.push(o);
      groups[key].revenue += o.total;
      if (o.paymentMethod === 'online') groups[key].online += o.total;
      else groups[key].cash += o.total;
    });
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const revOrders = getFilteredOrders();
  const revGroups = groupByDate(revOrders);
  const revTotal = revOrders.reduce((s, o) => s + o.total, 0);
  const revAvg = Math.round(revTotal / (revGroups.length || 1));
  const revBest = revGroups.reduce((best, g) => g.revenue > (best?.revenue || 0) ? g : best, revGroups[0]);
  const chartData = [...revGroups].reverse().slice(-14);
  const maxRevenue = Math.max(...chartData.map(g => g.revenue), 1);

  const getShortDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const getDateStr = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // ═══════ LOGIN SCREEN ═══════
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-dark to-primary-dark">
        <div className="bg-white p-12 rounded-[20px] shadow-xl w-full max-w-[420px] text-center mx-4">
          <div className="w-[60px] h-[60px] bg-gradient-to-br from-accent to-accent-dark rounded-full flex items-center justify-center mx-auto mb-5 text-xl text-white font-bold font-heading">
            L
          </div>
          <h2 className="font-heading text-2xl mb-2">Admin Login</h2>
          <p className="text-text-light text-sm mb-6">Enter your credentials to access the dashboard</p>
          {loginError && <p className="text-status-new text-sm mb-3">Invalid username or password!</p>}
          <div className="text-left mb-4">
            <label className="block mb-1.5 font-semibold text-sm text-dark">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="text-left mb-4">
            <label className="block mb-1.5 font-semibold text-sm text-dark">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()}
              placeholder="Enter password"
              className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            onClick={doLogin}
            className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white mt-2 hover:translate-y-[-2px] transition-all duration-300"
          >
            Login →
          </button>
        </div>
      </div>
    );
  }

  // ═══════ DASHBOARD ═══════
  return (
    <div className="min-h-screen bg-bg-warm">
      {/* Admin Navbar */}
      <div className="bg-dark py-3.5 sticky top-0 z-[100]">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <h2 className="font-heading text-white text-lg">La<span className="text-accent">Nature</span> — Dashboard</h2>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setActiveAdminTab('dashboard')}
              className={`px-5 py-2 rounded-[8px] text-sm transition-colors ${activeAdminTab === 'dashboard' ? 'bg-accent text-dark font-bold' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveAdminTab('gps-qr')}
              className={`px-5 py-2 rounded-[8px] text-sm transition-colors ${activeAdminTab === 'gps-qr' ? 'bg-accent text-dark font-bold' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              📍 GPS & QR
            </button>
            <button onClick={doLogout} className="bg-white/10 text-white px-5 py-2 rounded-[8px] text-sm hover:bg-white/20 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6">

      {/* ═══════ GPS & QR TAB ═══════ */}
      {activeAdminTab === 'gps-qr' && (
        <div className="py-6 space-y-6 animate-fade-up">

          {/* GPS Configuration */}
          <div className="bg-white rounded-[16px] shadow-DEFAULT p-8">
            <h3 className="font-heading text-xl mb-1">📍 GPS Location & Geo-Fence</h3>
            <p className="text-text-light text-sm mb-5">Set hotel coordinates and geo-fence radius for QR verification</p>

            <button
              onClick={captureGPS}
              disabled={gpsCapturing}
              className="px-6 py-3 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white hover:translate-y-[-2px] transition-all duration-300 disabled:opacity-50"
            >
              {gpsCapturing ? '⏳ Getting Location...' : '📡 Capture GPS Location'}
            </button>

            {gpsStatus && (
              <div className={`mt-3 px-4 py-2.5 rounded-[10px] text-sm ${gpsStatus.startsWith('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {gpsStatus.startsWith('success') ? '✅' : '❌'} {gpsStatus.split(':').slice(1).join(':')}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block mb-1.5 font-semibold text-sm text-dark">Latitude</label>
                <input
                  type="number" step="any" value={gpsLat} onChange={e => setGpsLat(e.target.value)}
                  placeholder="e.g. 31.1048"
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-sm text-dark">Longitude</label>
                <input
                  type="number" step="any" value={gpsLng} onChange={e => setGpsLng(e.target.value)}
                  placeholder="e.g. 77.1734"
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="block mb-1.5 font-semibold text-sm text-dark">Geo-Fence Radius: <span className="text-accent font-bold">{gpsRadius}m</span></label>
              <input
                type="range" min="20" max="300" value={gpsRadius}
                onChange={e => setGpsRadius(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-xs text-text-light mt-1">
                <span>20m</span><span>150m</span><span>300m</span>
              </div>
              <p className="text-xs text-text-light mt-2">📏 Customers outside this radius will be blocked from viewing the menu.</p>
            </div>

            {/* Room Radius */}
            <div className="mt-5">
              <label className="block mb-1.5 font-semibold text-sm text-dark">Room Geo-Fence Radius: <span className="text-accent font-bold">{gpsRoomRadius}m</span></label>
              <input
                type="range" min="50" max="500" value={gpsRoomRadius}
                onChange={e => setGpsRoomRadius(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-xs text-text-light mt-1">
                <span>50m</span><span>250m</span><span>500m</span>
              </div>
              <p className="text-xs text-text-light mt-2">🛏 Room service orders ke liye maximum distance.</p>
            </div>

            {/* Save Button */}
            <button
              onClick={async () => {
                setGpsSaving(true);
                setGpsSaveStatus('');
                const success = await adminAction('update_settings', {
                  settings: {
                    hotel_lat: parseFloat(gpsLat),
                    hotel_lng: parseFloat(gpsLng),
                    table_radius_meters: parseInt(gpsRadius),
                    room_radius_meters: parseInt(gpsRoomRadius),
                  }
                });
                clearConfigCache(); // Clear cached config so new settings take effect immediately
                setGpsSaving(false);
                setGpsSaveStatus(success ? 'success' : 'error');
                setTimeout(() => setGpsSaveStatus(''), 4000);
              }}
              disabled={gpsSaving}
              className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-accent to-accent-dark text-dark mt-5 hover:translate-y-[-2px] transition-all duration-300 disabled:opacity-50"
            >
              {gpsSaving ? '⏳ Saving...' : '💾 Save GPS Settings'}
            </button>

            {gpsSaveStatus === 'success' && (
              <div className="mt-3 px-4 py-2.5 rounded-[10px] text-sm bg-green-50 text-green-700 border border-green-200">
                ✅ Settings saved successfully! Ab yeh coordinates aur radius live system mein use honge.
              </div>
            )}
            {gpsSaveStatus === 'error' && (
              <div className="mt-3 px-4 py-2.5 rounded-[10px] text-sm bg-red-50 text-red-600 border border-red-200">
                ❌ Settings save nahi ho paaye. Kripya dubara try karein.
              </div>
            )}

            <div className="bg-bg-warm rounded-[12px] p-4 mt-5 text-xs text-text-light space-y-1.5">
              <p>📍 Hotel coordinates: <strong className="text-dark">{gpsLat}, {gpsLng}</strong></p>
              <p>📏 Table geo-fence: <strong className="text-dark">{gpsRadius}m</strong> • Room geo-fence: <strong className="text-dark">{gpsRoomRadius}m</strong></p>
              <p>✅ Settings Supabase database mein save hoti hain aur real-time apply hoti hain.</p>
            </div>
          </div>

          {/* Single QR Generator */}
          <div className="bg-white rounded-[16px] shadow-DEFAULT p-8">
            <h3 className="font-heading text-xl mb-1">🔐 QR Code Generator</h3>
            <p className="text-text-light text-sm mb-5">Generate GPS-secured QR codes for tables & rooms</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 font-semibold text-sm">Location Type</label>
                <select
                  value={qrType}
                  onChange={e => { setQrType(e.target.value); setShowQrResult(false); }}
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent bg-white"
                >
                  <option value="table">🍽 Table</option>
                  <option value="room">🛏 Room</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-sm">Number</label>
                <input
                  type="number" value={qrNumber}
                  onChange={e => { setQrNumber(e.target.value); setShowQrResult(false); }}
                  placeholder="e.g. 5" min="1" max="500"
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="bg-bg-warm rounded-[10px] p-4 text-xs text-text-light space-y-1.5 mt-4">
              <div className="flex items-center gap-2"><span>📏</span><span>Max distance: <strong className="text-dark">{qrType === 'table' ? '50m' : '200m'}</strong></span></div>
              <div className="flex items-center gap-2"><span>⏱</span><span>Session: <strong className="text-dark">{qrType === 'table' ? '1 hour' : '24 hours'}</strong></span></div>
              <div className="flex items-center gap-2"><span>📍</span><span>GPS verification required for every order</span></div>
            </div>

            <button
              onClick={generateQR}
              className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white mt-4 hover:translate-y-[-2px] transition-all duration-300"
            >
              🔐 Generate Secure QR Code
            </button>

            {showQrResult && (
              <div className="mt-6 p-8 border-2 border-dashed border-[#e0ddd5] rounded-[12px] text-center" ref={qrRef}>
                <h4 className="font-heading text-lg mb-1">{(qrType === 'table' ? 'Table ' : 'Room ') + qrNumber}</h4>
                <div className="flex justify-center mb-4">
                  <QRCodeCanvas
                    value={getQRUrl(qrType, qrNumber, qrToken, qrTimestamp)}
                    size={200}
                    fgColor="#1A1A1A"
                    bgColor="#FFFFFF"
                    level="H"
                  />
                </div>
                <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  🔒 GPS Secured • Unique Token
                </div>
                <p className="text-xs text-text-light break-all mb-4">{getQRUrl(qrType, qrNumber, qrToken, qrTimestamp)}</p>
                <div className="flex gap-3">
                  <button onClick={printQR} className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold bg-gradient-to-br from-accent to-accent-dark text-dark">🖨 Print QR</button>
                  <button onClick={downloadQR} className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">⬇ Download</button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Generator */}
          <div className="bg-white rounded-[16px] shadow-DEFAULT p-8">
            <h3 className="font-heading text-xl mb-1">📦 Bulk Generate</h3>
            <p className="text-text-light text-sm mb-5">Generate secured QR codes for multiple tables or rooms at once</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 font-semibold text-sm">Type</label>
                <select
                  value={bulkType}
                  onChange={e => { setBulkType(e.target.value); setShowBulk(false); }}
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent bg-white"
                >
                  <option value="table">Tables</option>
                  <option value="room">Rooms</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-sm">Count (1–20)</label>
                <input
                  type="number" value={bulkCount}
                  onChange={e => { setBulkCount(e.target.value); setShowBulk(false); }}
                  min="1" max="20"
                  className="w-full px-4 py-3 border-2 border-[#e0ddd5] rounded-[8px] text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
            <button
              onClick={bulkGenerate}
              className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white mt-4 hover:translate-y-[-2px] transition-all duration-300"
            >
              🔐 Generate All
            </button>

            {showBulk && (
              <div className="mt-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: Math.min(parseInt(bulkCount) || 5, 20) }, (_, i) => i + 1).map(num => {
                    const token = bulkTokens[num - 1] || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${num}`);
                    const url = getQRUrl(bulkType, num.toString(), token, bulkTimestamp);
                    const lbl = (bulkType === 'table' ? 'Table ' : 'Room ') + num;
                    return (
                      <div key={num} className="text-center p-4 bg-bg-warm rounded-[12px]" id={`bulk-qr-${num}`}>
                        <p className="font-bold text-sm mb-2">{lbl}</p>
                        <div className="flex justify-center">
                          <QRCodeCanvas value={url} size={120} fgColor="#1A1A1A" bgColor="#FFFFFF" level="M" />
                        </div>
                        <div className="text-[0.6rem] text-green-600 mt-1">🔒 Secured</div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={printBulk}
                  className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-accent to-accent-dark text-dark mt-4"
                >
                  🖨 Print All QR Codes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ DASHBOARD TAB ═══════ */}
      {activeAdminTab === 'dashboard' && (
        <div>
        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 py-6">
          <div className="bg-white rounded-[12px] p-6 shadow-DEFAULT text-center border-l-4 border-accent">
            <div className="text-4xl font-bold font-heading text-accent">{totalOrders}</div>
            <div className="text-sm text-text-light mt-1">Total Orders Today</div>
          </div>
          <div className="bg-white rounded-[12px] p-6 shadow-DEFAULT text-center border-l-4 border-status-preparing">
            <div className="text-4xl font-bold font-heading text-status-preparing">{pendingOrders}</div>
            <div className="text-sm text-text-light mt-1">Pending Orders</div>
          </div>
          <div className="bg-white rounded-[12px] p-6 shadow-DEFAULT text-center border-l-4 border-primary">
            <div className="text-4xl font-bold font-heading text-primary">{formatCurrency(todayRevenue)}</div>
            <div className="text-sm text-text-light mt-1">Revenue Today</div>
          </div>
        </div>

        {/* ── Active QR Sessions ── */}
        <div className="mt-6">
          <div className="flex flex-wrap justify-between items-center py-5 gap-3">
            <h3 className="font-heading text-xl">📡 Active QR Sessions</h3>
            <span className="text-sm text-text-light">{sessions.length} active</span>
          </div>
          {sessions.length === 0 ? (
            <div className="bg-white rounded-[12px] shadow-DEFAULT p-8 text-center text-text-muted mb-6">
              <div className="text-4xl mb-2">📡</div>
              <p className="text-sm">No active sessions. Sessions start when guests scan QR codes.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[12px] shadow-DEFAULT overflow-hidden mb-6">
              <table className="w-full border-collapse">
                <thead className="bg-dark">
                  <tr>
                    {['Type', 'Number', 'Started', 'Expires In', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/85">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => {
                    const remaining = s.expiresAt - Date.now();
                    const mins = Math.floor(remaining / 60000);
                    const hrs = Math.floor(mins / 60);
                    const timeStr = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
                    const isTable = s.type === 'table';
                    return (
                      <tr key={s.token} className="border-b border-gray-100 hover:bg-accent/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            isTable ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#E3F2FD] text-[#1565C0]'
                          }`}>
                            {isTable ? '🍽 Table' : '🛏 Room'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-lg">{s.id}</td>
                        <td className="px-5 py-3.5 text-sm text-text-light">
                          {new Date(s.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            mins < 10 ? 'bg-[#FFEBEE] text-[#C62828]' : 'bg-[#E8F5E9] text-[#2E7D32]'
                          }`}>
                            ⏱ {timeStr}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Active
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleCloseSession(s.token)}
                            className="px-4 py-2 rounded-[8px] text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            ✕ Close Session
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Live Orders ── */}
        <div className="flex flex-wrap justify-between items-center py-5 gap-3">
          <h3 className="font-heading text-xl">Live Orders</h3>
          <button onClick={handleMarkAllDelivered} className="px-5 py-2.5 rounded-[12px] text-sm font-semibold bg-gradient-to-br from-accent to-accent-dark text-dark">
            ✓ Mark All Delivered
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-10">
          {todayOrders.length === 0 ? (
            <div className="col-span-full text-center py-16 text-text-muted">
              <div className="text-5xl mb-3">📋</div>
              <p>No orders yet. Orders will appear here in real-time.</p>
            </div>
          ) : (
            [...todayOrders].reverse().map(order => {
              const statusColors: Record<string, string> = {
                new: 'bg-status-new', preparing: 'bg-status-preparing',
                ready: 'bg-status-ready', delivered: 'bg-status-delivered',
              };
              return (
                <div key={order.id} className="bg-white rounded-[12px] shadow-DEFAULT overflow-hidden animate-slide-in">
                  <div className={`px-5 py-1.5 text-white text-xs font-semibold uppercase tracking-wider ${statusColors[order.status] || 'bg-gray-500'}`}>
                    {order.status}
                  </div>
                  <div className="p-5">
                    <div className="font-heading text-lg text-dark mb-1">Order #{order.id}</div>
                    <div className="flex gap-4 text-sm text-text-light mb-3 flex-wrap">
                      <span>📍 {order.locationType} {order.locationNumber}</span>
                      <span>👤 {order.customer}</span>
                      <span>🕐 {formatTime(order.time)}</span>
                    </div>
                    <div className="bg-bg-warm rounded-[8px] p-3 mb-3">
                      {order.items.map((it, i) => (
                        <div key={i} className="flex justify-between py-1 text-sm">
                          <span>{it.name} × {it.qty}</span>
                          <span>₹{it.price * it.qty}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                      <span className="font-bold text-lg text-primary">{formatCurrency(order.total)}</span>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        order.paymentMethod === 'online' ? 'bg-[#EBF5FB] text-[#2980B9]' : 'bg-[#FEF9E7] text-[#B7950B]'
                      }`}>
                        {order.paymentMethod === 'online' ? '💳 Online' : '💵 Cash'}
                      </span>
                    </div>
                    {order.status !== 'delivered' && (
                      <div className="flex gap-2 mt-3.5">
                        {order.status === 'new' && (
                          <button onClick={() => changeStatus(order.id, 'preparing')} className="flex-1 py-2.5 rounded-[8px] text-xs font-semibold bg-status-preparing text-white">
                            🍳 Preparing
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button onClick={() => changeStatus(order.id, 'ready')} className="flex-1 py-2.5 rounded-[8px] text-xs font-semibold bg-status-ready text-white">
                            ✅ Ready
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button onClick={() => changeStatus(order.id, 'delivered')} className="flex-1 py-2.5 rounded-[8px] text-xs font-semibold bg-status-delivered text-white">
                            📦 Delivered
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Product Management ── */}
        <div className="mt-10">
          <div className="flex flex-wrap justify-between items-center gap-3 py-5">
            <h3 className="font-heading text-xl">🍽️ Product Management</h3>
            <div className="flex gap-2.5 items-center flex-wrap">
              <input
                type="text"
                placeholder="🔍 Search products..."
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
                className="px-4 py-2 rounded-full border-2 border-[#e0ddd5] text-sm w-[200px] outline-none focus:border-accent"
              />
              <select
                value={prodCatFilter}
                onChange={e => setProdCatFilter(e.target.value)}
                className="px-4 py-2 rounded-full border-2 border-[#e0ddd5] text-sm outline-none focus:border-accent"
              >
                <option value="all">All Categories</option>
                <option value="starters">Starters</option>
                <option value="main">Main Course</option>
                <option value="beverages">Beverages</option>
                <option value="desserts">Desserts</option>
              </select>
              <button onClick={() => openModal()} className="px-5 py-2 rounded-[8px] text-sm font-bold bg-accent text-dark">
                + Add Product
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[12px] shadow-DEFAULT overflow-hidden mb-10">
            <table className="w-full border-collapse">
              <thead className="bg-dark">
                <tr>
                  {['#', 'Product', 'Category', 'Price', 'Type', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/85">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-text-muted">No products found.</td></tr>
                ) : (
                  filteredProducts.map(p => {
                    const catColors: Record<string, string> = {
                      starters: 'bg-[#FFF3E0] text-[#E65100]', main: 'bg-[#E8F5E9] text-[#2E7D32]',
                      beverages: 'bg-[#E3F2FD] text-[#1565C0]', desserts: 'bg-[#FCE4EC] text-[#C62828]',
                    };
                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-accent/5 transition-colors even:bg-bg-warm/50">
                        <td className="px-5 py-3.5 text-text-light text-xs">{p.id}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-[45px] h-[45px] rounded-[8px] overflow-hidden shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <strong className="text-sm">{p.name}</strong>
                              <div className="text-xs text-text-light max-w-[200px] truncate">{p.desc}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${catColors[p.category] || ''}`}>
                            {CAT_LABELS[p.category] || p.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-primary">₹{p.price}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.veg ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFEBEE] text-[#C62828]'
                          }`}>
                            {p.veg ? '🟢 Veg' : '🔴 Non-Veg'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button onClick={() => openModal(p)} className="w-9 h-9 rounded-[8px] hover:bg-[#E3F2FD] hover:scale-110 transition-all flex items-center justify-center">✏️</button>
                            <button onClick={() => confirmDelete(p.id, p.name)} className="w-9 h-9 rounded-[8px] hover:bg-[#FFEBEE] hover:scale-110 transition-all flex items-center justify-center">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Revenue History ── */}
        <div className="mt-10 pb-16">
          <div className="flex flex-wrap justify-between items-center py-5 gap-3">
            <h3 className="font-heading text-xl">📊 Revenue History</h3>
            <div className="flex gap-2">
              {[{ d: 7, l: '7 Days' }, { d: 30, l: '30 Days' }, { d: 0, l: 'All Time' }].map(t => (
                <button
                  key={t.d}
                  onClick={() => setRevPeriod(t.d)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                    revPeriod === t.d ? 'bg-primary text-white border-primary' : 'bg-bg-warm text-text-main border-transparent hover:bg-primary hover:text-white'
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-4">
            <div className="bg-white rounded-[12px] p-6 shadow-DEFAULT text-center border-l-4 border-primary">
              <div className="text-3xl font-bold font-heading text-primary">{formatCurrency(revTotal)}</div>
              <div className="text-sm text-text-light mt-1">Total Revenue</div>
            </div>
            <div className="bg-white rounded-[12px] p-6 shadow-DEFAULT text-center border-l-4 border-accent">
              <div className="text-3xl font-bold font-heading text-accent">{formatCurrency(revAvg)}</div>
              <div className="text-sm text-text-light mt-1">Avg / Day</div>
            </div>
            <div className="bg-white rounded-[12px] p-6 shadow-DEFAULT text-center border-l-4 border-status-preparing">
              <div className="text-3xl font-bold font-heading text-status-preparing">{revBest ? getShortDate(revBest.date) : '—'}</div>
              <div className="text-sm text-text-light mt-1">Best Day</div>
            </div>
            <div className="bg-white rounded-[12px] p-6 shadow-DEFAULT text-center border-l-4 border-primary">
              <div className="text-3xl font-bold font-heading text-primary">{revOrders.length}</div>
              <div className="text-sm text-text-light mt-1">Total Orders</div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-[12px] shadow-DEFAULT p-7 mt-5">
            {chartData.length === 0 ? (
              <div className="text-center py-10 text-text-muted">No data to display</div>
            ) : (
              <div className="flex items-end gap-2 h-[220px] border-b-2 border-[#e8e6e0]">
                {chartData.map(g => {
                  const pct = Math.max((g.revenue / maxRevenue) * 100, 4);
                  const isToday = new Date(g.date).toDateString() === new Date().toDateString();
                  return (
                    <div key={g.date} className="flex-1 flex flex-col items-center h-full justify-end relative min-w-0 group">
                      <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-dark text-white px-3.5 py-2 rounded-[8px] text-xs font-semibold text-center whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:bottom-[calc(100%+12px)] transition-all duration-200 z-10 leading-relaxed pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-dark">
                        ₹{g.revenue.toLocaleString('en-IN')}<br /><small>{g.orders.length} orders</small>
                      </div>
                      <div
                        className={`w-[70%] max-w-[50px] min-h-[4px] rounded-t-[6px] cursor-pointer transition-all duration-400 animate-bar-grow hover:brightness-115 hover:scale-x-[1.15] ${
                          isToday
                            ? 'bg-gradient-to-b from-accent to-[#B8860B] shadow-[0_0_12px_rgba(201,168,76,0.4)]'
                            : 'bg-gradient-to-b from-[#4CAF50] to-primary'
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                      <div className="text-[0.7rem] text-text-light mt-2 text-center whitespace-nowrap font-medium">
                        {getShortDate(g.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revenue Table */}
          <div className="bg-white rounded-[12px] shadow-DEFAULT overflow-x-auto mt-5">
            <table className="w-full border-collapse min-w-[600px]">
              <thead className="bg-dark">
                <tr>
                  {['Date', 'Orders', 'Revenue', 'Avg Order', 'Payment Split'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-white/85">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revGroups.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-text-muted">No revenue data yet.</td></tr>
                ) : (
                  revGroups.map(g => {
                    const isToday = new Date(g.date).toDateString() === new Date().toDateString();
                    const avgOrder = Math.round(g.revenue / g.orders.length);
                    return (
                      <tr key={g.date} className={`border-b border-gray-100 hover:bg-accent/5 transition-colors ${isToday ? 'bg-accent/10 border-l-4 border-l-accent' : 'even:bg-bg-warm/50'}`}>
                        <td className="px-5 py-3.5">
                          <strong>{getDateStr(g.date)}</strong>
                          {isToday && <span className="inline-block bg-accent text-dark text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ml-1.5 align-middle">Today</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm">{g.orders.length}</td>
                        <td className="px-5 py-3.5 font-bold text-primary">{formatCurrency(g.revenue)}</td>
                        <td className="px-5 py-3.5 text-sm">{formatCurrency(avgOrder)}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-block text-xs px-2 py-0.5 rounded-[6px] bg-[#EBF5FB] text-[#2980B9] font-medium mx-0.5">💳 {formatCurrency(g.online)}</span>
                          <span className="inline-block text-xs px-2 py-0.5 rounded-[6px] bg-[#FEF9E7] text-[#B7950B] font-medium mx-0.5">💵 {formatCurrency(g.cash)}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
      </div>

      {/* ── Product Modal ── */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[2000]" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[16px] shadow-xl z-[2100] w-[520px] max-w-[92vw] max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-200">
              <h3 className="font-heading text-xl">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setModalOpen(false)} className="bg-bg-warm w-9 h-9 rounded-full flex items-center justify-center text-lg">✕</button>
            </div>
            <div className="px-7 py-5 space-y-4">
              <div>
                <label className="block mb-1.5 font-semibold text-sm text-dark">Product Name *</label>
                <input value={prodName} onChange={e => setProdName(e.target.value)} placeholder="e.g. Paneer Tikka" className="w-full px-3.5 py-2.5 border-2 border-[#e0ddd5] rounded-[10px] text-sm outline-none focus:border-accent" />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block mb-1.5 font-semibold text-sm text-dark">Category *</label>
                  <select value={prodCategory} onChange={e => setProdCategory(e.target.value)} className="w-full px-3.5 py-2.5 border-2 border-[#e0ddd5] rounded-[10px] text-sm outline-none focus:border-accent bg-white">
                    <option value="starters">🥘 Starters</option>
                    <option value="main">🍛 Main Course</option>
                    <option value="beverages">🥤 Beverages</option>
                    <option value="desserts">🍮 Desserts</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-semibold text-sm text-dark">Price (₹) *</label>
                  <input type="number" value={prodPrice} onChange={e => setProdPrice(e.target.value)} placeholder="e.g. 220" min="1" className="w-full px-3.5 py-2.5 border-2 border-[#e0ddd5] rounded-[10px] text-sm outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-sm text-dark">Description</label>
                <input value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="Short description of the dish" className="w-full px-3.5 py-2.5 border-2 border-[#e0ddd5] rounded-[10px] text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-sm text-dark">Product Image</label>
                <div
                  onClick={() => document.getElementById('prodImgFile')?.click()}
                  className="border-2 border-dashed border-[#d0cdc5] rounded-[12px] p-5 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all min-h-[120px] flex items-center justify-center"
                >
                  {prodImg ? (
                    <div className="relative w-full h-[140px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={prodImg} alt="Preview" className="w-full h-full object-cover rounded-[8px]" />
                      <button
                        onClick={e => { e.stopPropagation(); setProdImg(''); }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-status-new"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="text-3xl">📷</div>
                      <p className="text-sm font-semibold">Click to upload image</p>
                      <span className="text-xs text-text-light">JPG, PNG, WebP supported</span>
                    </div>
                  )}
                </div>
                <input type="file" id="prodImgFile" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-sm text-dark">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setProdIsVeg(true)}
                    className={`flex-1 py-2.5 border-2 rounded-[10px] text-sm font-semibold text-center transition-all ${
                      prodIsVeg ? 'border-primary bg-primary/10' : 'border-[#e0ddd5] bg-white'
                    }`}
                  >
                    🟢 Veg
                  </button>
                  <button
                    onClick={() => setProdIsVeg(false)}
                    className={`flex-1 py-2.5 border-2 rounded-[10px] text-sm font-semibold text-center transition-all ${
                      !prodIsVeg ? 'border-primary bg-primary/10' : 'border-[#e0ddd5] bg-white'
                    }`}
                  >
                    🔴 Non-Veg
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-7 py-4 border-t border-gray-200">
              <button onClick={() => setModalOpen(false)} className="px-6 py-2.5 rounded-[12px] bg-[#e0ddd5] text-dark font-semibold text-sm">
                Cancel
              </button>
              <button onClick={saveProductHandler} className="px-6 py-2.5 rounded-[12px] bg-gradient-to-br from-primary to-primary-light text-white font-semibold text-sm">
                💾 Save Product
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
