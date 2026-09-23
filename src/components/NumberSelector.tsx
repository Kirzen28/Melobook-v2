import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface NumberSelectorProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
}

export const NumberSelector: React.FC<NumberSelectorProps> = ({ value, min, max, step = 1, onChange, label }) => {
  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      const clamped = Math.min(Math.max(val, min), max);
      onChange(clamped);
    }
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={handleDecrement}
        className="number-selector-btn p-1.5 rounded bg-[#222226] hover:bg-[#333] text-gray-300 border border-[#333] transition-colors cursor-pointer"
        aria-label="Diminuer"
      >
        <Minus className="w-3 h-3" />
      </button>
      <input
        type="number"
        value={value}
        onChange={handleManualChange}
        min={min}
        max={max}
        step={step}
        className="number-selector-input w-14 sm:w-16 bg-[#1C1C1E] border border-[#333] rounded px-1.5 py-1 text-center text-xs text-white focus:outline-none focus:border-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium"
      />
      <button
        type="button"
        onClick={handleIncrement}
        className="number-selector-btn p-1.5 rounded bg-[#222226] hover:bg-[#333] text-gray-300 border border-[#333] transition-colors cursor-pointer"
        aria-label="Augmenter"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};
