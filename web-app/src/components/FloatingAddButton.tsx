'use client';

import { Plus, Camera, Receipt } from 'lucide-react';
import { useState } from 'react';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-40 group"
      aria-label="Add transaction by scanning receipt"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-accent-500 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
      
      {/* Button */}
      <div className="relative flex items-center gap-2 px-5 py-4 bg-accent-500 hover:bg-accent-400 rounded-full shadow-lg shadow-accent-500/25 transition-all duration-300 ease-out transform hover:scale-105">
        <div className="relative">
          <Receipt className={`w-5 h-5 text-midnight-950 transition-transform duration-300 ${isHovered ? 'scale-0' : 'scale-100'}`} />
          <Camera className={`w-5 h-5 text-midnight-950 absolute inset-0 transition-transform duration-300 ${isHovered ? 'scale-100' : 'scale-0'}`} />
        </div>
        <span className="font-semibold text-midnight-950 whitespace-nowrap">
          Scan Receipt
        </span>
      </div>

      {/* Tooltip on mobile - shows on tap */}
      <span className="sr-only">
        Scan a receipt to add a new transaction
      </span>
    </button>
  );
}

