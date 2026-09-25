import React from 'react';

interface MetronomeIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export const MetronomeIcon: React.FC<MetronomeIconProps> = ({
  className = 'w-4 h-4',
  size,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Outer pyramid body with flat base */}
      <path d="M9 3.5h6l4.5 16.2a1 1 0 0 1-.96 1.3H5.46a1 1 0 0 1-.96-1.3L9 3.5z" />

      {/* Internal scale / window line */}
      <path d="M10 11.5h4" strokeWidth="1.5" opacity="0.6" />
      <path d="M10.5 14.5h3" strokeWidth="1.5" opacity="0.6" />

      {/* Swinging pendulum arm extending past top */}
      <path d="M12 18.5L18 3" />

      {/* Sliding tempo weight on arm */}
      <rect 
        x="13.5" 
        y="6.2" 
        width="3" 
        height="2.2" 
        rx="0.5" 
        transform="rotate(22 15 7.3)"
        fill="currentColor"
      />

      {/* Lower pivot point */}
      <circle cx="12" cy="18.5" r="1.2" fill="currentColor" />
    </svg>
  );
};
