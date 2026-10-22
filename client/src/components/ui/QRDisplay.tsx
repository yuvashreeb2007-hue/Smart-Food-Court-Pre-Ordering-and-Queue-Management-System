import React from 'react';
import { QrCode, ShieldCheck } from 'lucide-react';

interface QRDisplayProps {
  tokenNumber: number;
  qrToken: string;
  isUsed?: boolean;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({
  tokenNumber,
  qrToken,
  isUsed = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-[#E5E7E2] shadow-xs text-center max-w-sm mx-auto">
      <div className="flex items-center gap-1.5 text-xs font-medium text-[#244C3A] bg-[#E8F1E9] px-3 py-1 rounded-full mb-3">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Single-Use Collection Token</span>
      </div>

      <div className="text-3xl font-bold tracking-tight text-[#244C3A] mb-1">
        TOKEN #{tokenNumber}
      </div>
      <p className="text-xs text-[#68716A] mb-4">
        Present this QR code at the pickup counter when your token is called
      </p>

      {/* Styled QR container */}
      <div className="relative p-4 bg-[#FAF8F3] rounded-xl border-2 border-dashed border-[#244C3A]/30 mb-3">
        {isUsed && (
          <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center text-white p-4">
            <span className="font-semibold text-sm">COLLECTED</span>
            <span className="text-[11px] text-stone-300">Token consumed</span>
          </div>
        )}

        {/* Scalable SVG QR code representation */}
        <svg
          viewBox="0 0 160 160"
          className="w-44 h-44 mx-auto text-[#244C3A]"
          fill="currentColor"
        >
          {/* Outer corners */}
          <rect x="10" y="10" width="40" height="40" fill="#244C3A" rx="4" />
          <rect x="18" y="18" width="24" height="24" fill="#FAF8F3" rx="2" />
          <rect x="24" y="24" width="12" height="12" fill="#244C3A" rx="1" />

          <rect x="110" y="10" width="40" height="40" fill="#244C3A" rx="4" />
          <rect x="118" y="18" width="24" height="24" fill="#FAF8F3" rx="2" />
          <rect x="124" y="24" width="12" height="12" fill="#244C3A" rx="1" />

          <rect x="10" y="110" width="40" height="40" fill="#244C3A" rx="4" />
          <rect x="18" y="118" width="24" height="24" fill="#FAF8F3" rx="2" />
          <rect x="24" y="124" width="12" height="12" fill="#244C3A" rx="1" />

          {/* Data cells pattern */}
          <rect x="60" y="15" width="10" height="10" />
          <rect x="80" y="20" width="15" height="10" />
          <rect x="65" y="35" width="10" height="15" />
          <rect x="85" y="40" width="15" height="10" />

          <rect x="15" y="65" width="10" height="10" />
          <rect x="35" y="60" width="15" height="10" />
          <rect x="20" y="85" width="10" height="15" />
          <rect x="40" y="80" width="10" height="15" />

          {/* Center token badge */}
          <rect x="60" y="60" width="40" height="40" fill="#244C3A" rx="8" />
          <circle cx="80" cy="80" r="14" fill="#FAF8F3" />
          <text
            x="80"
            y="85"
            textAnchor="middle"
            fill="#244C3A"
            fontSize="12"
            fontWeight="bold"
            fontFamily="Poppins"
          >
            SFC
          </text>

          {/* Bottom right patterns */}
          <rect x="115" y="65" width="10" height="15" />
          <rect x="135" y="60" width="15" height="10" />
          <rect x="110" y="85" width="15" height="10" />
          <rect x="135" y="85" width="10" height="15" />

          <rect x="65" y="115" width="15" height="10" />
          <rect x="85" y="120" width="10" height="15" />
          <rect x="60" y="135" width="10" height="10" />
          <rect x="80" y="140" width="20" height="10" />
          <rect x="120" y="120" width="20" height="20" rx="3" />
        </svg>
      </div>

      <div className="w-full text-left bg-stone-50 p-2.5 rounded-lg border border-[#E5E7E2]">
        <div className="text-[10px] text-[#68716A] uppercase tracking-wider font-semibold">
          Verification Payload (Opaque UUID)
        </div>
        <div className="font-mono text-xs text-[#242B26] break-all select-all font-medium">
          {qrToken}
        </div>
      </div>
    </div>
  );
};
