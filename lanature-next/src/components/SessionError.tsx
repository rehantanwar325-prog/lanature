'use client';

import Link from 'next/link';

export type SessionErrorType = 'GPS_DENIED' | 'GPS_UNAVAILABLE' | 'GPS_TIMEOUT' | 'GPS_ERROR' | 'GPS_NOT_SUPPORTED'
  | 'INVALID_TOKEN' | 'EXPIRED' | 'OUT_OF_RANGE' | 'CLOSED';

interface SessionErrorProps {
  type: SessionErrorType;
  message?: string;
  distance?: number;
  onRetry?: () => void;
}

const ERROR_CONFIG: Record<SessionErrorType, { icon: string; title: string; defaultMsg: string; color: string }> = {
  GPS_DENIED: {
    icon: '📍',
    title: 'Location Permission Required',
    defaultMsg: 'Order karne ke liye location permission zaroori hai. Apne browser settings se location allow karein aur page refresh karein.',
    color: 'from-red-500 to-red-600',
  },
  GPS_UNAVAILABLE: {
    icon: '📡',
    title: 'Location Unavailable',
    defaultMsg: 'Aapki location detect nahi ho paa rahi. Kripya GPS on karein aur dobara try karein.',
    color: 'from-yellow-500 to-orange-500',
  },
  GPS_TIMEOUT: {
    icon: '⏱',
    title: 'Location Timeout',
    defaultMsg: 'Location lene mein zyada time lag raha hai. GPS on karein aur retry karein.',
    color: 'from-yellow-500 to-orange-500',
  },
  GPS_ERROR: {
    icon: '⚠️',
    title: 'Location Error',
    defaultMsg: 'Location service mein kuch problem hai. Kripya retry karein.',
    color: 'from-yellow-500 to-orange-500',
  },
  GPS_NOT_SUPPORTED: {
    icon: '🚫',
    title: 'GPS Not Supported',
    defaultMsg: 'Aapka browser GPS support nahi karta. Kripya modern browser use karein.',
    color: 'from-red-500 to-red-600',
  },
  INVALID_TOKEN: {
    icon: '🔒',
    title: 'Invalid QR Code',
    defaultMsg: 'Yeh QR code valid nahi hai ya expire ho chuka hai. Kripya QR code dobara scan karein.',
    color: 'from-red-500 to-red-600',
  },
  EXPIRED: {
    icon: '⏰',
    title: 'Session Expired',
    defaultMsg: 'Aapka session expire ho gaya hai. Kripya dobara QR code scan karein.',
    color: 'from-orange-500 to-red-500',
  },
  OUT_OF_RANGE: {
    icon: '📏',
    title: 'Out of Range',
    defaultMsg: 'Aap allowed area se bahar hain. Wapas aakar order karein ya dobara QR scan karein.',
    color: 'from-orange-500 to-red-500',
  },
  CLOSED: {
    icon: '🚪',
    title: 'Session Closed',
    defaultMsg: 'Yeh session staff dwara band kar diya gaya hai. Kripya naya QR code scan karein.',
    color: 'from-gray-500 to-gray-600',
  },
};

export default function SessionError({ type, message, distance, onRetry }: SessionErrorProps) {
  const config = ERROR_CONFIG[type];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark to-primary-dark px-4">
      <div className="bg-white rounded-[20px] shadow-xl max-w-[440px] w-full p-10 text-center animate-fade-up">
        {/* Icon */}
        <div className={`w-20 h-20 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center mx-auto mb-5 text-3xl text-white`}>
          {config.icon}
        </div>

        {/* Title */}
        <h2 className="font-heading text-2xl mb-3 text-dark">{config.title}</h2>

        {/* Message */}
        <p className="text-text-light text-sm leading-relaxed mb-2">
          {message || config.defaultMsg}
        </p>

        {/* Distance info */}
        {distance !== undefined && (
          <p className="text-xs text-text-muted mb-4">
            📏 Aapki current distance: <strong className="text-status-new">{distance}m</strong>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-6">
          {onRetry && (type === 'GPS_UNAVAILABLE' || type === 'GPS_TIMEOUT' || type === 'GPS_ERROR' || type === 'OUT_OF_RANGE') && (
            <button
              onClick={onRetry}
              className="w-full py-3.5 rounded-[12px] font-semibold bg-gradient-to-br from-primary to-primary-light text-white hover:translate-y-[-2px] transition-all duration-300"
            >
              🔄 Retry
            </button>
          )}
          <Link
            href="/"
            className="w-full py-3.5 rounded-[12px] font-semibold border-2 border-accent text-accent hover:bg-accent hover:text-dark transition-all duration-300 text-center"
          >
            🏠 Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
