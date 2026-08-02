import React, { useState } from 'react';

interface BmiLogoProps {
  variant?: 'full' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const BmiLogo: React.FC<BmiLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = true
}) => {
  const [imgError, setImgError] = useState(false);

  // Google Drive Direct Image URL
  const driveFileId = '167ih8dakzjvd7kPPrY54xJzJeUkwWNHY';
  const logoImgUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;

  // Size dimensions map
  const sizeMap = {
    sm: { box: 'w-8 h-8', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10', text: 'text-base sm:text-lg', sub: 'text-[10px]' },
    lg: { box: 'w-12 h-12', text: 'text-xl', sub: 'text-xs' },
    xl: { box: 'w-16 h-16', text: 'text-2xl sm:text-3xl', sub: 'text-sm' },
  };

  const dim = sizeMap[size];

  // Precision SVG Vector of the Official BMI University Shield Emblem
  const OfficialCrestSvg = (
    <svg 
      viewBox="0 0 200 220" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-lg"
    >
      <defs>
        {/* Purple Shield Gradient */}
        <linearGradient id="purpleShield" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4c0677" />
          <stop offset="60%" stopColor="#3b0764" />
          <stop offset="100%" stopColor="#2e054f" />
        </linearGradient>

        {/* Gold Banner Gradient */}
        <linearGradient id="goldBanner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffeb3b" />
          <stop offset="50%" stopColor="#fbc02d" />
          <stop offset="100%" stopColor="#f57f17" />
        </linearGradient>

        {/* Dove Gold Gradient */}
        <linearGradient id="goldDove" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffee58" />
          <stop offset="100%" stopColor="#f57f17" />
        </linearGradient>
      </defs>

      {/* Main Purple Shield Body */}
      <path
        d="M 38 40 L 162 40 C 162 40 165 110 162 135 C 158 160 100 195 100 195 C 100 195 42 160 38 135 C 35 110 38 40 38 40 Z"
        fill="url(#purpleShield)"
        stroke="#ffd54f"
        strokeWidth="3.5"
      />

      {/* Shield Inner Gold Border Accent */}
      <path
        d="M 44 46 L 156 46 C 156 46 158 108 156 130 C 152 152 100 184 100 184 C 100 184 48 152 44 130 C 42 108 44 46 44 46 Z"
        fill="none"
        stroke="#fbc02d"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Laurel Wreath (White Leaves around center) */}
      <g stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Left Laurel Branch Arc */}
        <path d="M 100 145 C 75 142 62 120 62 95 C 62 72 78 55 92 50" />
        {/* Right Laurel Branch Arc */}
        <path d="M 100 145 C 125 142 138 120 138 95 C 138 72 122 55 108 50" />
      </g>

      {/* Laurel Leaves (Left Branch) */}
      <g fill="#ffffff">
        <path d="M 64 125 Q 52 122 56 114 Q 68 116 64 125 Z" />
        <path d="M 60 110 Q 48 102 54 96 Q 64 100 60 110 Z" />
        <path d="M 60 92 Q 48 82 56 78 Q 64 84 60 92 Z" />
        <path d="M 66 76 Q 56 64 66 62 Q 72 70 66 76 Z" />
        <path d="M 78 62 Q 72 48 82 48 Q 86 58 78 62 Z" />

        {/* Laurel Leaves (Right Branch) */}
        <path d="M 136 125 Q 148 122 144 114 Q 132 116 136 125 Z" />
        <path d="M 140 110 Q 152 102 146 96 Q 136 100 140 110 Z" />
        <path d="M 140 92 Q 152 82 144 78 Q 136 84 140 92 Z" />
        <path d="M 134 76 Q 144 64 134 62 Q 128 70 134 76 Z" />
        <path d="M 122 62 Q 128 48 118 48 Q 114 58 122 62 Z" />
      </g>

      {/* Central Gold Dove / Phoenix Emblem */}
      <g fill="url(#goldDove)">
        {/* Dove Body & Head */}
        <path d="M 88 82 C 82 78 78 84 82 90 C 86 96 92 102 98 108 C 104 114 108 124 104 130 C 108 124 114 116 110 106 C 106 98 98 94 94 88 C 92 84 92 82 88 82 Z" />
        {/* Dove Head Beak */}
        <path d="M 78 82 L 82 85 L 82 80 Z" />
        {/* Flames / Feathers Wings */}
        <path d="M 94 92 C 102 85 110 74 118 64 C 114 74 110 82 104 88 Z" />
        <path d="M 96 98 C 106 94 116 86 122 74 C 116 84 110 92 104 96 Z" />
        <path d="M 98 104 C 108 102 118 96 124 88 C 118 96 110 102 104 104 Z" />
        <path d="M 96 110 C 104 110 114 108 120 102 C 112 108 106 110 98 112 Z" />
        <path d="M 92 116 C 98 120 106 122 112 120 C 104 122 98 120 92 116 Z" />
      </g>

      {/* TOP YELLOW RIBBON / BANNER */}
      <g>
        {/* Folded Ribbon Back Tails (Left) */}
        <path d="M 12 28 L 38 18 L 38 52 L 22 62 L 32 40 Z" fill="#f57f17" stroke="#1f2937" strokeWidth="2" />
        {/* Folded Ribbon Back Tails (Right) */}
        <path d="M 188 28 L 162 18 L 162 52 L 178 62 L 168 40 Z" fill="#f57f17" stroke="#1f2937" strokeWidth="2" />

        {/* Top Curved Main Yellow Ribbon */}
        <path
          d="M 25 18 C 75 8 125 8 175 18 L 168 52 C 122 42 78 42 32 52 Z"
          fill="url(#goldBanner)"
          stroke="#1f2937"
          strokeWidth="2.5"
        />

        {/* Text 'BMI' on Top Ribbon */}
        <text
          x="100"
          y="38"
          textAnchor="middle"
          fill="#3b0764"
          fontSize="24"
          fontWeight="900"
          fontFamily="Georgia, serif"
          letterSpacing="4"
        >
          BMI
        </text>
      </g>

      {/* BOTTOM YELLOW RIBBON / BANNER */}
      <g>
        {/* Folded Ribbon Back Tails (Left) */}
        <path d="M 28 152 L 48 135 L 48 168 L 20 182 L 34 162 Z" fill="#f57f17" stroke="#1f2937" strokeWidth="2" />
        {/* Folded Ribbon Back Tails (Right) */}
        <path d="M 172 152 L 152 135 L 152 168 L 180 182 L 166 162 Z" fill="#f57f17" stroke="#1f2937" strokeWidth="2" />

        {/* Bottom Curved Main Yellow Ribbon */}
        <path
          d="M 36 135 C 78 148 122 148 164 135 L 172 168 C 125 184 75 184 28 168 Z"
          fill="url(#goldBanner)"
          stroke="#1f2937"
          strokeWidth="2.5"
        />

        {/* Text 'UNIVERSITY' on Bottom Ribbon */}
        <text
          x="100"
          y="158"
          textAnchor="middle"
          fill="#3b0764"
          fontSize="14"
          fontWeight="900"
          fontFamily="Georgia, serif"
          letterSpacing="2"
        >
          UNIVERSITY
        </text>
      </g>
    </svg>
  );

  // Logo Graphic - Render direct Google Drive image or SVG fallback
  const LogoGraphic = !imgError ? (
    <img
      src={logoImgUrl}
      alt="BMI University Crest"
      className="w-full h-full object-contain drop-shadow-md transition-transform duration-200 hover:scale-105"
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
    />
  ) : (
    OfficialCrestSvg
  );

  if (variant === 'icon') {
    return (
      <div className={`${dim.box} relative flex items-center justify-center shrink-0 ${className}`}>
        {LogoGraphic}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-amber-400/40 text-white shadow-lg backdrop-blur-sm ${className}`}>
        <div className="w-7 h-7 shrink-0">{LogoGraphic}</div>
        <div className="flex flex-col">
          <span className="font-extrabold text-xs tracking-tight text-amber-300 font-serif">BETHEL MINISTRIES INT'L</span>
          <span className="text-[8px] uppercase tracking-widest text-purple-200 font-bold">Official Shield Emblem</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Crest Emblem Box */}
      <div className={`${dim.box} relative shrink-0 transition-transform duration-200 hover:scale-105`}>
        {LogoGraphic}
      </div>

      {/* Typography Header */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className={`font-black tracking-tight text-white ${dim.text} font-serif`}>
            BMI <span className="text-amber-400 font-sans">MINISTRIES</span>
          </span>
          <span className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-700 to-indigo-700 text-amber-200 shadow-sm border border-amber-400/30">
            UMS
          </span>
        </div>

        {showTagline && (
          <p className={`${dim.sub} text-purple-200/90 font-medium tracking-tight truncate max-w-[220px] sm:max-w-none`}>
            Bethel Ministries International
          </p>
        )}
      </div>
    </div>
  );
};


