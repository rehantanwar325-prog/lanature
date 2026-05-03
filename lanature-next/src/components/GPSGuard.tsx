'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { getCurrentPosition, type GeoCoords } from '@/lib/geo';
import { getSession, createSession, validateSession, type QRSession, type SessionValidation } from '@/lib/session';
import { isValidQRType, type QRType } from '@/lib/config';
import SessionError, { type SessionErrorType } from './SessionError';

interface GPSGuardProps {
  qrType: string;
  qrId: string;
  token: string;
  children: (props: { session: QRSession; coords: GeoCoords; revalidate: () => Promise<SessionValidation | null> }) => ReactNode;
}

type GuardState =
  | { status: 'requesting_gps' }
  | { status: 'loading'; message: string; step: number }
  | { status: 'error'; errorType: SessionErrorType; errorMsg?: string; distance?: number }
  | { status: 'ready'; session: QRSession; coords: GeoCoords };

export default function GPSGuard({ qrType, qrId, token, children }: GPSGuardProps) {
  const [state, setState] = useState<GuardState>({ status: 'requesting_gps' });
  const [gpsRequested, setGpsRequested] = useState(false);

  const validate = useCallback(async () => {
    // 1. Validate QR type
    if (!isValidQRType(qrType)) {
      setState({ status: 'error', errorType: 'INVALID_TOKEN' });
      return;
    }
    const type = qrType as QRType;

    // 2. Get GPS — auto-trigger location permission
    setState({ status: 'loading', message: 'Aapki location detect ho rahi hai...', step: 1 });
    let coords: GeoCoords;
    try {
      coords = await getCurrentPosition();
    } catch (err) {
      const errMsg = (err as Error).message as SessionErrorType;
      setState({ status: 'error', errorType: errMsg || 'GPS_ERROR' });
      return;
    }

    // 3. Check local storage for an active session
    setState({ status: 'loading', message: 'Session verify ho raha hai...', step: 2 });
    const sessionKey = `lanature_session_${type}_${qrId}`;
    const localSessionToken = sessionStorage.getItem(sessionKey);
    let activeSession = null;

    if (localSessionToken) {
      activeSession = await getSession(localSessionToken);
    }

    if (activeSession) {
      setState({ status: 'loading', message: 'Location verify ho rahi hai...', step: 3 });
      const result = await validateSession(localSessionToken!, coords);

      if (result.valid) {
        setState({ status: 'ready', session: result.session, coords });
      } else {
        sessionStorage.removeItem(sessionKey);
        setState({
          status: 'error',
          errorType: result.reason as SessionErrorType,
          errorMsg: result.message,
          distance: result.distance,
        });
      }
    } else {
      setState({ status: 'loading', message: 'Naya session start ho raha hai...', step: 3 });
      const session = await createSession(type, qrId, coords.lat, coords.lng);
      sessionStorage.setItem(sessionKey, session.token);
      setState({ status: 'ready', session, coords });
    }
  }, [qrType, qrId, token]);

  // Auto-trigger GPS request on mount
  useEffect(() => {
    if (!gpsRequested) {
      setGpsRequested(true);
      // Small delay to show the permission request UI first
      const timer = setTimeout(() => {
        validate();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gpsRequested, validate]);

  /**
   * Re-validate before placing order.
   */
  const revalidate = useCallback(async (): Promise<SessionValidation | null> => {
    try {
      if (state.status !== 'ready') return null;
      const coords = await getCurrentPosition();
      return await validateSession(state.session.token, coords);
    } catch {
      return null;
    }
  }, [state]);

  // ─── GPS Permission Request Screen ───
  if (state.status === 'requesting_gps') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark to-primary-dark px-4">
        <div className="bg-white rounded-[24px] shadow-2xl p-10 text-center max-w-[420px] w-full animate-fade-up">
          {/* Animated Location Pin */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-accent/30 rounded-full animate-pulse" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-accent to-accent-dark rounded-full flex items-center justify-center text-4xl shadow-[0_8px_30px_rgba(201,168,76,0.4)]">
              📍
            </div>
          </div>

          <h2 className="font-heading text-2xl mb-2 text-dark">Location Allow Karein</h2>
          <p className="text-text-light text-sm leading-relaxed mb-5">
            Menu dekhne aur order karne ke liye aapki <strong>location permission</strong> zaroori hai.
            Browser ka popup aayega — kripya <strong>&quot;Allow&quot;</strong> dabayein.
          </p>

          {/* Visual instruction */}
          <div className="bg-bg-warm rounded-[14px] p-5 mb-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary shrink-0">1</div>
              <p className="text-sm text-dark">Browser location popup aayega</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary shrink-0">2</div>
              <p className="text-sm text-dark"><strong>&quot;Allow&quot;</strong> ya <strong>&quot;अनुमति दें&quot;</strong> click karein</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-sm font-bold text-accent shrink-0">3</div>
              <p className="text-sm text-dark">Menu automatically load ho jayega ✨</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-semibold">
            🔒 Aapki location sirf order verify karne ke liye use hogi
          </div>

          {/* Loading dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2.5 h-2.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
          <p className="text-xs text-text-muted mt-2">Location request ho rahi hai...</p>
        </div>
      </div>
    );
  }

  // ─── Loading Steps ───
  if (state.status === 'loading') {
    const steps = [
      { label: 'Location detect', done: state.step > 1 },
      { label: 'Session verify', done: state.step > 2 },
      { label: 'Menu loading', done: state.step > 3 },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark to-primary-dark px-4">
        <div className="bg-white rounded-[24px] shadow-2xl p-10 text-center max-w-[420px] w-full animate-fade-up">
          {/* Success Location Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl text-white shadow-[0_6px_25px_rgba(39,174,96,0.35)]">
            {state.step >= 2 ? '✅' : '📍'}
          </div>

          <h3 className="font-heading text-xl mb-4 text-dark">{state.message}</h3>

          {/* Progress Steps */}
          <div className="space-y-3 mb-5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500 ${
                  s.done ? 'bg-green-500 text-white' : i === state.step - 1 ? 'bg-accent text-dark animate-pulse' : 'bg-gray-200 text-gray-400'
                }`}>
                  {s.done ? '✓' : i + 1}
                </div>
                <div className={`h-1 flex-1 rounded-full transition-all duration-500 ${s.done ? 'bg-green-400' : i === state.step - 1 ? 'bg-accent/50' : 'bg-gray-100'}`} />
                <span className={`text-sm font-medium ${s.done ? 'text-green-600' : i === state.step - 1 ? 'text-dark' : 'text-gray-300'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="w-12 h-12 border-4 border-gray-200 border-t-accent rounded-full mx-auto animate-spin" />
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (state.status === 'error') {
    return (
      <SessionError
        type={state.errorType}
        message={state.errorMsg}
        distance={state.distance}
        onRetry={validate}
      />
    );
  }

  // ─── Ready — render children with session data ───
  return <>{children({ session: state.session, coords: state.coords, revalidate })}</>;
}
