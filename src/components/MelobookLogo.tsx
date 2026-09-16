import React from 'react';

interface MelobookLogoProps {
  className?: string;
  size?: number;
}

export const MelobookLogo: React.FC<MelobookLogoProps> = ({ 
  className = 'w-9 h-9 sm:w-10 sm:h-10', 
  size 
}) => {
  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 500 500"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(0,229,255,0.25)]"
        aria-label="Logo Melobook"
        role="img"
      >
        <defs>
          {/* Metallic Cyan / Turquoise Gradient */}
          <linearGradient id="logoTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4DE1F7" />
            <stop offset="20%" stopColor="#26C6DA" />
            <stop offset="50%" stopColor="#00ACC1" />
            <stop offset="80%" stopColor="#00838F" />
            <stop offset="100%" stopColor="#004D40" />
          </linearGradient>

          {/* Metallic Violet / Indigo Gradient */}
          <linearGradient id="logoPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B388FF" />
            <stop offset="25%" stopColor="#7C4DFF" />
            <stop offset="55%" stopColor="#651FFF" />
            <stop offset="85%" stopColor="#4A148C" />
            <stop offset="100%" stopColor="#311B92" />
          </linearGradient>

          {/* Central Note Gradient */}
          <linearGradient id="logoNoteGrad" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#E1BEE7" />
            <stop offset="25%" stopColor="#9575CD" />
            <stop offset="55%" stopColor="#673AB7" />
            <stop offset="85%" stopColor="#512DA8" />
            <stop offset="100%" stopColor="#311B92" />
          </linearGradient>

          {/* Spine and Base Gradient */}
          <linearGradient id="logoBaseGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#00838F" />
            <stop offset="35%" stopColor="#26C6DA" />
            <stop offset="65%" stopColor="#7E57C2" />
            <stop offset="100%" stopColor="#4527A0" />
          </linearGradient>

          {/* Metallic highlights */}
          <linearGradient id="logoSheen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.25" />
          </linearGradient>

          {/* Outer glow */}
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#00E5FF" floodOpacity="0.2" />
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#7C4DFF" floodOpacity="0.25" />
          </filter>
        </defs>

        <g filter="url(#logoGlow)">
          {/* ================= LEFT WING (CYAN / TEAL PAGES) ================= */}
          {/* Upper Left Main Page Frame */}
          <path
            d="M 242 216 
               C 210 188, 172 176, 150 172 
               L 125 285 
               C 142 278, 170 272, 238 274 
               L 242 258 
               C 185 256, 155 260, 142 268 
               L 160 190 
               C 178 194, 212 204, 238 226 
               Z"
            fill="url(#logoTealGrad)"
            stroke="#00E5FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Left Corner Fold Accent */}
          <path
            d="M 150 172 L 165 190 L 125 285 L 112 280 Z"
            fill="#00BCD4"
            opacity="0.8"
          />

          {/* Left Middle Page Layer */}
          <path
            d="M 235 288 
               C 170 286, 125 296, 92 322 
               L 85 334 
               C 120 310, 170 300, 234 302 
               Z"
            fill="url(#logoTealGrad)"
            stroke="#4DD0E1"
            strokeWidth="1"
          />

          {/* Left Lower Page Layer */}
          <path
            d="M 232 318 
               C 165 316, 120 330, 85 356 
               L 78 368 
               C 118 344, 168 332, 230 334 
               Z"
            fill="url(#logoTealGrad)"
            stroke="#26C6DA"
            strokeWidth="1"
          />

          {/* Left Base Underline */}
          <path
            d="M 226 352 
               C 170 350, 130 366, 98 382 
               L 90 388 
               L 105 388 
               C 135 374, 172 362, 224 364 
               Z"
            fill="url(#logoTealGrad)"
            stroke="#00ACC1"
            strokeWidth="1"
          />

          {/* ================= RIGHT WING (VIOLET / INDIGO PAGES) ================= */}
          {/* Upper Right Main Page Frame */}
          <path
            d="M 258 216 
               C 290 188, 328 176, 350 172 
               L 375 285 
               C 358 278, 330 272, 262 274 
               L 258 258 
               C 315 256, 345 260, 358 268 
               L 340 190 
               C 322 194, 288 204, 262 226 
               Z"
            fill="url(#logoPurpleGrad)"
            stroke="#B388FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Right Corner Fold Accent */}
          <path
            d="M 350 172 L 335 190 L 375 285 L 388 280 Z"
            fill="#7C4DFF"
            opacity="0.8"
          />

          {/* Right Middle Page Layer */}
          <path
            d="M 265 288 
               C 330 286, 375 296, 408 322 
               L 415 334 
               C 380 310, 330 300, 266 302 
               Z"
            fill="url(#logoPurpleGrad)"
            stroke="#9575CD"
            strokeWidth="1"
          />

          {/* Right Lower Page Layer */}
          <path
            d="M 268 318 
               C 335 316, 380 330, 415 356 
               L 422 368 
               C 382 344, 332 332, 270 334 
               Z"
            fill="url(#logoPurpleGrad)"
            stroke="#7E57C2"
            strokeWidth="1"
          />

          {/* Right Base Underline */}
          <path
            d="M 274 352 
               C 330 350, 370 366, 402 382 
               L 410 388 
               L 395 388 
               C 365 374, 328 362, 276 364 
               Z"
            fill="url(#logoPurpleGrad)"
            stroke="#5E35B1"
            strokeWidth="1"
          />

          {/* ================= BOOK SPINE & BASE ================= */}
          {/* Vertical Central Pointer Wedge */}
          <path
            d="M 250 288 
               L 254 340 
               L 246 340 
               Z"
            fill="#26C6DA"
            stroke="#00E5FF"
            strokeWidth="1"
          />

          {/* Bottom Center Spine U-Curve Dip */}
          <path
            d="M 218 366 
               C 232 376, 244 388, 250 388 
               C 256 388, 268 376, 282 366 
               L 282 378 
               C 268 388, 256 400, 250 400 
               C 244 400, 232 388, 218 378 
               Z"
            fill="url(#logoBaseGrad)"
            stroke="#00ACC1"
            strokeWidth="1"
          />

          {/* ================= CENTRAL MUSICAL NOTE ================= */}
          <g>
            {/* Note Head (Tilted Oval with metallic bevel) */}
            <ellipse
              cx="232"
              cy="252"
              rx="34"
              ry="25"
              transform="rotate(-24 232 252)"
              fill="url(#logoNoteGrad)"
              stroke="#D1C4E9"
              strokeWidth="2"
            />
            {/* Inner Metallic Circular Sheen */}
            <ellipse
              cx="230"
              cy="250"
              rx="22"
              ry="15"
              transform="rotate(-24 230 250)"
              fill="url(#logoSheen)"
              opacity="0.6"
            />

            {/* Note Stem (Vertical Bar) */}
            <path
              d="M 250 242 
                 L 250 102 
                 L 264 100 
                 L 264 236 
                 Z"
              fill="url(#logoPurpleGrad)"
              stroke="#B388FF"
              strokeWidth="1.5"
            />

            {/* Note Flag (Swooping Croche Hook) */}
            <path
              d="M 264 100 
                 C 278 120, 312 142, 318 170 
                 C 322 188, 314 208, 301 224 
                 C 305 214, 308 202, 306 192 
                 C 302 172, 284 154, 264 140 
                 Z"
              fill="url(#logoPurpleGrad)"
              stroke="#E1BEE7"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
