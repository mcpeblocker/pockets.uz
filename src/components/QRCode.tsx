'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
}

export default function QRCode({ 
  value, 
  size = 200, 
  level = 'M',
  className = '' 
}: QRCodeProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={true}
        />
      </div>
    </div>
  );
}
