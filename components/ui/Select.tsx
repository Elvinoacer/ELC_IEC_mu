'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function CustomSelect({ label, options, value, onChange, placeholder = 'Select an option', required = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">
        {label} {required && <span className="text-brand-500">*</span>}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 bg-white/5 border rounded-2xl text-left flex justify-between items-center transition-all duration-300 group hover:bg-white/8 ${
          isOpen ? 'border-brand-500 ring-4 ring-brand-500/10 shadow-lg' : 'border-white/10'
        }`}
      >
        <span className={`${!selectedOption ? 'text-slate-500' : 'text-white'} font-medium`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`w-5 h-5 text-slate-500 group-hover:text-brand-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-2 bg-[#0d121f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn">
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-5 py-3.5 cursor-pointer text-sm font-medium transition-colors hover:bg-brand-500/10 ${
                  value === option.value ? 'bg-brand-500/20 text-brand-400' : 'text-slate-300 hover:text-white'
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Hidden input for form submission if needed */}
      <input type="hidden" value={value} required={required} />
    </div>
  );
}
