'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import GPSGuard from '@/components/GPSGuard';
import SessionError from '@/components/SessionError';
import { getMenuData, generateOrderId, placeOrderSecure, type MenuItem, type CartItem } from '@/lib/store';
import { type QRSession, type SessionValidation } from '@/lib/session';
import { type GeoCoords } from '@/lib/geo';
import { QR_CONFIG } from '@/lib/config';

/* ═══════════════════════════════════════════════════════
   GPS-Secured Menu — only accessible via valid QR scan
   URL: /order?type=table&id=5&token=UUID&t=TIMESTAMP
   ═══════════════════════════════════════════════════════ */

function OrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const qrType = searchParams.get('type') || '';
  const qrId = searchParams.get('id') || '';
  const token = searchParams.get('token') || '';
  const timestamp = searchParams.get('t') || '';

  // If no valid params, redirect to home
  if (!qrType || !qrId || !token) {
    return <SessionError type="INVALID_TOKEN" />;
  }

  return (
    <GPSGuard qrType={qrType} qrId={qrId} token={token}>
      {({ session, coords, revalidate }) => (
        <SecuredMenu session={session} coords={coords} revalidate={revalidate} />
      )}
    </GPSGuard>
  );
}

/* ═══════════════════════════════════════════════════════ */

interface SecuredMenuProps {
  session: QRSession;
  coords: GeoCoords;
  revalidate: () => Promise<SessionValidation | null>;
}

function SecuredMenu({ session, coords, revalidate }: SecuredMenuProps) {
  const router = useRouter();
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);
  const [gpsChecking, setGpsChecking] = useState(false);
  const [gpsError, setGpsError] = useState<{ type: string; message: string; distance?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const config = QR_CONFIG[session.type];
  const locationType = config.label;
  const locationNumber = session.id;

  // Session timer
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // Fetch menu data from Supabase
    const loadMenu = async () => {
      setLoading(true);
      const data = await getMenuData();
      setMenuData(data);
      setLoading(false);
    };
    loadMenu();
  }, []);

  // Update remaining time each second
  useEffect(() => {
    const tick = () => {
      const remain = session.expiresAt - Date.now();
      if (remain <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hrs = Math.floor(remain / 3600000);
      const mins = Math.floor((remain % 3600000) / 60000);
      const secs = Math.floor((remain % 60000) / 1000);
      if (hrs > 0) {
        setTimeLeft(`${hrs}h ${mins}m`);
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.expiresAt]);

  const filteredMenu = activeCategory === 'all'
    ? menuData
    : menuData.filter(i => i.category === activeCategory);

  const addToCart = useCallback((itemId: number) => {
    const item = menuData.find(i => i.id === itemId);
    if (!item) return;
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (existing) {
        return prev.map(c => c.id === itemId ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setAddedId(itemId);
    setTimeout(() => setAddedId(null), 800);
  }, [menuData]);

  const updateQty = (itemId: number, delta: number) => {
    setCart(prev =>
      prev.map(c => c.id === itemId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      setNameError(true);
      return;
    }
    if (cart.length === 0) {
      alert('Please add items to your cart first!');
      return;
    }

    // ── GPS Re-check before placing order ──
    setGpsChecking(true);
    setGpsError(null);

    const result = await revalidate();

    if (!result) {
      setGpsChecking(false);
      setGpsError({
        type: 'GPS_ERROR',
        message: 'Location verify nahi ho paayi. Kripya GPS on karein aur retry karein.',
      });
      return;
    }

    if (!result.valid) {
      setGpsChecking(false);
      setGpsError({
        type: result.reason,
        message: result.message,
        distance: result.distance,
      });
      return;
    }

    setGpsChecking(false);

    // ✅ GPS verified — place order through SECURE edge function
    setGpsChecking(true); // Show loading while edge function processes

    try {
      const currentCoords = await import('@/lib/geo').then(m => m.getCurrentPosition());
      
      const response = await placeOrderSecure({
        sessionToken: session.token,
        customer: customerName.trim(),
        items: cart.map(c => ({ name: c.name, qty: c.qty, price: c.price })),
        paymentMethod: 'cash', // Will be updated on payment page
        userLat: currentCoords.lat,
        userLng: currentCoords.lng,
      });

      setGpsChecking(false);

      if (!response.success) {
        setGpsError({
          type: response.code || 'SERVER_ERROR',
          message: response.message || 'Order place nahi ho paya. Retry karein.',
        });
        return;
      }

      // Save confirmed order for payment page display
      const confirmedOrder = {
        id: response.order!.id,
        customer: response.order!.customer,
        locationType: response.order!.locationType,
        locationNumber: response.order!.locationNumber,
        items: response.order!.items,
        total: response.order!.total,
        status: 'new' as const,
        paymentMethod: null,
        time: response.order!.time || new Date().toISOString(),
        sessionToken: session.token,
        serverVerified: true, // Flag that order is already saved by server
      };
      sessionStorage.setItem('lanature_pending_order', JSON.stringify(confirmedOrder));
      router.push('/payment');
    } catch (err) {
      setGpsChecking(false);
      setGpsError({
        type: 'GPS_ERROR',
        message: 'Location verify nahi ho paayi. Kripya GPS on karein aur retry karein.',
      });
    }
  };

  return (
    <>
      <Navbar forceScrolled />

      {/* Session Info Banner */}
      <div className="bg-gradient-to-br from-dark to-primary-dark pt-24 pb-4 text-white">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="font-heading text-4xl font-bold">Our Menu</h2>
          <p className="text-white/70 mt-2">Crafted with love, served with elegance</p>
          <div className="flex items-center justify-center gap-3 flex-wrap mt-3">
            <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent rounded-full px-6 py-2.5 text-accent font-semibold">
              📍 <span>{locationType} {locationNumber}</span>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
              timeLeft === 'Expired'
                ? 'bg-red-500/20 border border-red-400 text-red-300'
                : 'bg-white/10 border border-white/20 text-white/80'
            }`}>
              ⏱ Session: {timeLeft}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300 font-medium">GPS Verified • Secure Session</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-3 justify-center flex-wrap py-7 sticky top-[60px] bg-bg z-[100] border-b border-gray-200">
        {[
          { key: 'all', label: 'All Items' },
          { key: 'starters', label: '🥘 Starters' },
          { key: 'main', label: '🍛 Main Course' },
          { key: 'beverages', label: '🥤 Beverages' },
          { key: 'desserts', label: '🍮 Desserts' },
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-6 py-2.5 rounded-full font-semibold text-sm border-2 tracking-wide transition-all duration-300 ${
              activeCategory === cat.key
                ? 'bg-primary text-white border-primary'
                : 'bg-bg-warm text-text-main border-transparent hover:bg-primary hover:text-white hover:border-primary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="max-w-[1200px] mx-auto px-6">
        {loading ? (
          <div className="text-center py-16 text-text-muted">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-accent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
            {filteredMenu.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-[12px] shadow-DEFAULT overflow-hidden flex flex-col hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300 animate-fade-up"
              >
                <div className="relative w-full h-[200px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3.5 h-3.5 border-2 ${item.veg ? 'border-[#27AE60]' : 'border-[#E74C3C]'} rounded-[3px] flex items-center justify-center`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.veg ? 'bg-[#27AE60]' : 'bg-[#E74C3C]'}`} />
                    </span>
                    <span className={`text-[0.7rem] font-semibold ${item.veg ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
                      {item.veg ? 'VEG' : 'NON-VEG'}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg text-dark mb-1">{item.name}</h3>
                  <p className="text-sm text-text-light mb-3 flex-1">{item.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">₹{item.price}</span>
                    <button
                      onClick={() => addToCart(item.id)}
                      className={`px-5 py-2.5 rounded-[8px] font-semibold text-sm transition-all duration-300 ${
                        addedId === item.id
                          ? 'bg-accent text-dark'
                          : 'bg-gradient-to-br from-primary to-primary-light text-white hover:scale-105 hover:shadow-[0_4px_15px_rgba(45,80,22,0.3)]'
                      }`}
                    >
                      {addedId === item.id ? '✓ Added!' : '+ Add'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <div
        onClick={() => setCartOpen(true)}
        className="fixed bottom-6 right-6 z-[999] bg-gradient-to-br from-accent to-accent-dark w-16 h-16 rounded-full flex items-center justify-center shadow-[0_6px_30px_rgba(201,168,76,0.4)] cursor-pointer hover:scale-110 transition-all duration-300 text-2xl"
      >
        🛒
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-status-new text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {cartCount}
          </span>
        )}
      </div>

      {/* Cart Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[1100] transition-all duration-300 ${
          cartOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setCartOpen(false)}
      />

      {/* Cart Sidebar */}
      <div
        className={`fixed top-0 h-screen w-[400px] max-w-[90vw] bg-white z-[1200] flex flex-col shadow-[-8px_0_30px_rgba(0,0,0,0.15)] transition-all duration-400 ${
          cartOpen ? 'right-0' : 'right-[-420px]'
        }`}
      >
        {/* Cart Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-heading text-xl">🛒 Your Cart</h3>
          <button
            onClick={() => setCartOpen(false)}
            className="bg-bg-warm w-9 h-9 rounded-full flex items-center justify-center text-lg hover:bg-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <div className="text-5xl mb-3">🛒</div>
              <p>Your cart is empty</p>
              <p className="text-xs mt-1">Add some delicious items!</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3.5 py-3.5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-[8px] overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-dark mb-1">{item.name}</h4>
                  <span className="text-primary font-bold text-sm">₹{item.price * item.qty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="w-[30px] h-[30px] rounded-full bg-bg-warm flex items-center justify-center font-bold text-dark hover:bg-primary hover:text-white transition-colors"
                  >
                    −
                  </button>
                  <span className="font-bold min-w-[20px] text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="w-[30px] h-[30px] rounded-full bg-bg-warm flex items-center justify-center font-bold text-dark hover:bg-primary hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-6 border-t border-gray-200 bg-bg-warm">
          <div className="flex justify-between text-lg font-bold mb-4">
            <span>Total</span>
            <span className="text-primary text-xl">₹{cartTotal}</span>
          </div>
          <input
            type="text"
            placeholder={nameError ? '⚠ Please enter your name!' : 'Enter your name *'}
            value={customerName}
            onChange={e => { setCustomerName(e.target.value); setNameError(false); }}
            className={`w-full px-4 py-3 rounded-[8px] border-2 text-sm mb-3 outline-none transition-all ${
              nameError ? 'border-status-new' : 'border-[#e0ddd5] focus:border-accent focus:shadow-[0_0_0_3px_rgba(201,168,76,0.15)]'
            }`}
            maxLength={40}
          />

          {/* GPS Status */}
          <div className="flex items-center gap-1.5 mb-3 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span>GPS Verified • {locationType} {locationNumber}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={gpsChecking}
            className={`w-full py-3.5 rounded-[12px] font-semibold transition-all duration-300 ${
              gpsChecking
                ? 'bg-gray-400 text-white cursor-wait'
                : 'bg-gradient-to-br from-primary to-primary-light text-white shadow-[0_4px_15px_rgba(45,80,22,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_25px_rgba(45,80,22,0.4)]'
            }`}
          >
            {gpsChecking ? '📍 Verifying Location...' : 'Place Order →'}
          </button>
        </div>
      </div>

      {/* GPS Re-check Error Modal */}
      {gpsError && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[2000]" onClick={() => setGpsError(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[16px] shadow-xl z-[2100] w-[440px] max-w-[92vw] p-8 text-center animate-fade-up">
            <div className="text-5xl mb-4">
              {gpsError.type === 'OUT_OF_RANGE' ? '📏' : gpsError.type === 'EXPIRED' ? '⏰' : '⚠️'}
            </div>
            <h3 className="font-heading text-xl mb-2">
              {gpsError.type === 'OUT_OF_RANGE' ? 'Out of Range' : gpsError.type === 'EXPIRED' ? 'Session Expired' : 'Location Error'}
            </h3>
            <p className="text-text-light text-sm mb-2">{gpsError.message}</p>
            {gpsError.distance !== undefined && (
              <p className="text-xs text-text-muted mb-4">📏 Distance: <strong className="text-status-new">{gpsError.distance}m</strong></p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setGpsError(null)}
                className="flex-1 py-2.5 rounded-[12px] font-semibold bg-[#e0ddd5] text-dark"
              >
                Close
              </button>
              <button
                onClick={() => { setGpsError(null); handlePlaceOrder(); }}
                className="flex-1 py-2.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white"
              >
                🔄 Retry
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark to-primary-dark">
        <div className="bg-white rounded-[20px] shadow-xl p-12 text-center max-w-[400px]">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-accent rounded-full mx-auto mb-5 animate-spin" />
          <h3 className="font-heading text-xl mb-2">Loading Menu</h3>
          <p className="text-text-light text-sm">Please wait...</p>
        </div>
      </div>
    }>
      <OrderContent />
    </Suspense>
  );
}
