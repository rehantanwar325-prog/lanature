'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  | { status: 'loading'; message: string; step: number }
  | { status: 'error'; errorType: SessionErrorType; errorMsg?: string; distance?: number }
  | { status: 'ready'; session: QRSession; coords: GeoCoords };

export default function GPSGuard({ qrType, qrId, token, children }: GPSGuardProps) {
  const [state, setState] = useState<GuardState>({ status: 'loading', message: 'Location detect ho rahi hai...', step: 1 });
  const hasStarted = useRef(false);

  const validate = useCallback(async () => {
    try {
      // 1. Validate QR type
      if (!isValidQRType(qrType)) {
        setState({ status: 'error', errorType: 'INVALID_TOKEN' });
        return;
      }
      const type = qrType as QRType;

      // 2. Get GPS — with IP fallback built into getCurrentPosition
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
    } catch (err) {
      console.error('GPSGuard validate error:', err);
      setState({ status: 'error', errorType: 'GPS_ERROR', errorMsg: 'Kuch problem aa gayi. Retry karein.' });
    }
  }, [qrType, qrId, token]);

  // Start validation IMMEDIATELY on mount — no delay
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      validate();
    }
  }, [validate]);

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
          {/* Location Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-accent/30 rounded-full animate-pulse" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-accent to-accent-dark rounded-full flex items-center justify-center text-4xl shadow-[0_8px_30px_rgba(201,168,76,0.4)]">
              {state.step >= 2 ? '✅' : '📍'}
            </div>
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

          <p className="text-xs text-text-muted mt-4">
            Agar location popup aaye toh <strong>&quot;Allow&quot;</strong> dabayein
          </p>
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
