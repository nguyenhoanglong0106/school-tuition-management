import { forwardRef } from 'react';
import { clsx } from 'clsx';

// Text Input
export const Input = forwardRef(function Input(
  { label, error, required, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={clsx('form-input', error && 'form-input-error', className)}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

// VND amount input: displays thousands separators while emitting digits only.
export const MoneyInput = forwardRef(function MoneyInput(
  { label, error, required, className = '', value = '', onChange, ...props },
  ref
) {
  const rawValue = String(value ?? '').replace(/\D/g, '');
  const displayValue = rawValue ? Number(rawValue).toLocaleString('vi-VN') : '';

  const handleChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '');
    onChange?.({ target: { ...event.target, value: digits } });
  };

  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        inputMode="numeric"
        className={clsx('form-input', error && 'form-input-error', className)}
        value={displayValue}
        onChange={handleChange}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

// Textarea
export const Textarea = forwardRef(function Textarea(
  { label, error, required, rows = 3, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={clsx('form-input resize-none', error && 'form-input-error', className)}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

// Select
export const Select = forwardRef(function Select(
  { label, error, required, options = [], placeholder = 'Chọn...', className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={clsx('form-input', error && 'form-input-error', className)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

// Search Input with icon
export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-10"
      />
    </div>
  );
}

// Checkbox
export const Checkbox = forwardRef(function Checkbox(
  { label, className = '', ...props },
  ref
) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        {...props}
      />
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
});
