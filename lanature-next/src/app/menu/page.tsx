'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

/**
 * Menu page — now requires valid QR scan to access.
 * Direct visitors without QR params are shown a message to scan QR.
 * If token param exists, redirect to /order page.
 */
function MenuContent() {
  const searchParams = useSearchParams();

  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const id = searchParams.get('id') || searchParams.get('table') || searchParams.get('room');

  // If has token params, redirect to the secured order page
  if (token && type && id) {
    if (typeof window !== 'undefined') {
      const t = searchParams.get('t') || Date.now().toString();
      window.location.href = `/order?type=${type}&id=${id}&token=${token}&t=${t}`;
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  // No valid QR params — show "scan QR to order" message
  return (
    <>
      <Navbar forceScrolled />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark to-primary-dark px-4">
        <div className="bg-white rounded-[20px] shadow-xl max-w-[440px] w-full p-10 text-center animate-fade-up">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent-dark rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
            📱
          </div>

          <h2 className="font-heading text-2xl mb-3 text-dark">Scan QR Code to Order</h2>

          <p className="text-text-light text-sm leading-relaxed mb-6">
            Kripya apni table ya room par laage hue QR code ko scan karein.
            QR code scan karne par aapko menu dikhega aur aap order kar sakte hain.
          </p>

          <div className="bg-bg-warm rounded-[12px] p-5 mb-6 text-left space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🍽</span>
              <div>
                <h4 className="font-semibold text-sm text-dark">Table QR</h4>
                <p className="text-xs text-text-light">Restaurant dining area mein tables par laga hoga</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🛏</span>
              <div>
                <h4 className="font-semibold text-sm text-dark">Room QR</h4>
                <p className="text-xs text-text-light">Hotel rooms mein laga hoga for room service</p>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-semibold mb-5">
            🔒 GPS-secured ordering for your safety
          </div>

          <Link
            href="/"
            className="block w-full py-3.5 rounded-[12px] font-semibold border-2 border-accent text-accent hover:bg-accent hover:text-dark transition-all duration-300 text-center"
          >
            🏠 Go to Home
          </Link>
        </div>
      </div>
    </>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-muted">Loading...</div>}>
      <MenuContent />
    </Suspense>
  );
}
