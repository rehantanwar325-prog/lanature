'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { formatCurrency, type Order } from '@/lib/store';

type Step = 'summary' | 'online' | 'cash' | 'confirmed';

export default function PaymentPage() {
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [step, setStep] = useState<Step>('summary');
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    const data = sessionStorage.getItem('lanature_pending_order');
    if (data) setPendingOrder(JSON.parse(data));
  }, []);

  const showConfirmation = async (method: 'online' | 'cash') => {
    if (!pendingOrder) return;
    const finalOrder = { ...pendingOrder, paymentMethod: method, status: 'new' as const };
    // Order is already saved by the edge function (serverVerified flag)
    // No need to call saveOrder again — just update display
    sessionStorage.removeItem('lanature_pending_order');
    setPendingOrder(finalOrder);
    setStep('confirmed');
  };

  const payOnline = () => {
    setStep('online');
    setTimeout(() => {
      setPaySuccess(true);
      setTimeout(() => showConfirmation('online'), 1500);
    }, 2500);
  };

  const payCash = () => {
    setStep('cash');
    setTimeout(() => showConfirmation('cash'), 2000);
  };

  if (!pendingOrder && step !== 'confirmed') {
    return (
      <>
        <Navbar forceScrolled />
        <div className="min-h-screen pt-24 pb-16 bg-bg">
          <div className="max-w-[560px] mx-auto bg-white rounded-[20px] shadow-lg p-10 text-center">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="font-heading text-2xl mb-2">No Pending Order</h2>
            <p className="text-text-light mb-5">Looks like you haven&apos;t placed an order yet.</p>
            <Link
              href="/menu?table=1"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white"
            >
              Browse Menu →
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar forceScrolled />
      <div className="min-h-screen pt-24 pb-16 bg-bg">
        <div className="max-w-[600px] mx-auto px-4">

          {/* Step 1: Order Summary */}
          {step === 'summary' && pendingOrder && (
            <div className="bg-white rounded-[20px] shadow-lg p-10">
              <h2 className="font-heading text-2xl text-center mb-6">Order Summary</h2>
              <div className="mb-6">
                {pendingOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2.5 border-b border-gray-100 text-sm">
                    <span className="text-dark">{item.name} × {item.qty}</span>
                    <span className="font-semibold text-primary">₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-4 text-xl font-bold border-t-2 border-dark mt-2">
                <span>Grand Total</span>
                <span>₹{pendingOrder.total}</span>
              </div>

              <h3 className="font-heading text-center mt-7 mb-4">Choose Payment Method</h3>
              <div className="space-y-4">
                <button
                  onClick={payOnline}
                  className="w-full flex items-center gap-4 p-5 border-2 border-[#e8e6e0] rounded-[12px] hover:border-accent hover:bg-accent/5 transition-all duration-300 text-left"
                >
                  <div className="w-[50px] h-[50px] rounded-full bg-[#EBF5FB] text-[#2980B9] flex items-center justify-center text-2xl shrink-0">
                    💳
                  </div>
                  <div>
                    <h4 className="font-semibold">Pay Online</h4>
                    <p className="text-xs text-text-light">UPI, Credit/Debit Card, Net Banking</p>
                  </div>
                </button>
                <button
                  onClick={payCash}
                  className="w-full flex items-center gap-4 p-5 border-2 border-[#e8e6e0] rounded-[12px] hover:border-accent hover:bg-accent/5 transition-all duration-300 text-left"
                >
                  <div className="w-[50px] h-[50px] rounded-full bg-[#E8F8F5] text-[#27AE60] flex items-center justify-center text-2xl shrink-0">
                    💵
                  </div>
                  <div>
                    <h4 className="font-semibold">Pay with Cash</h4>
                    <p className="text-xs text-text-light">Pay to our staff when food is delivered</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Online Processing */}
          {step === 'online' && (
            <div className="bg-white rounded-[20px] shadow-lg p-10 text-center">
              {!paySuccess ? (
                <>
                  <div className="w-[60px] h-[60px] border-4 border-gray-200 border-t-accent rounded-full mx-auto mb-5 animate-spin" />
                  <h3 className="font-heading text-xl">Processing Payment...</h3>
                  <p className="text-text-light mt-2 text-sm">Please wait while we verify your payment</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4 animate-pop-in">✅</div>
                  <h3 className="font-heading text-xl text-primary">Payment Successful!</h3>
                  <p className="text-text-light mt-2 text-sm">₹{pendingOrder?.total} paid successfully</p>
                </>
              )}
            </div>
          )}

          {/* Step 3: Cash */}
          {step === 'cash' && (
            <div className="bg-white rounded-[20px] shadow-lg p-10 text-center">
              <div className="text-5xl mb-4">💵</div>
              <h3 className="font-heading text-xl">Cash Payment Selected</h3>
              <p className="text-text-light mt-3 mb-5">
                Please pay <strong className="text-primary text-xl">₹{pendingOrder?.total}</strong><br />
                to our staff when your food is delivered.
              </p>
              <div className="w-[60px] h-[60px] border-4 border-gray-200 border-t-primary rounded-full mx-auto mb-3 animate-spin" />
              <p className="text-xs text-text-muted">Confirming your order...</p>
            </div>
          )}

          {/* Step 4: Confirmed */}
          {step === 'confirmed' && pendingOrder && (
            <div className="bg-white rounded-[20px] shadow-lg p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-status-delivered to-[#2ECC71] rounded-full flex items-center justify-center mx-auto mb-5 text-3xl text-white animate-pop-in">
                ✓
              </div>
              <h2 className="font-heading text-3xl text-primary mb-2">Order Confirmed!</h2>
              <p className="text-text-light">Thank you for ordering with LaNature</p>

              <div className="text-left bg-bg-warm rounded-[12px] p-5 my-5 space-y-2">
                {[
                  { label: 'Order ID', value: `#${pendingOrder.id}` },
                  { label: 'Location', value: `${pendingOrder.locationType} ${pendingOrder.locationNumber}` },
                  { label: 'Customer', value: pendingOrder.customer },
                  { label: 'Payment', value: pendingOrder.paymentMethod === 'online' ? '💳 Paid Online' : '💵 Cash on Delivery' },
                  { label: 'Total', value: formatCurrency(pendingOrder.total), highlight: true },
                  { label: 'Estimated Delivery', value: '20 – 30 minutes', accent: true },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2 text-sm">
                    <span className="text-text-light">{row.label}</span>
                    <span className={`font-semibold ${row.highlight ? 'text-primary' : row.accent ? 'text-accent' : 'text-dark'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-text-light mt-4">
                Our chefs are preparing your food with love 🧑‍🍳<br />
                Sit back, relax, and enjoy the ambiance!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white mt-5"
              >
                ← Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
