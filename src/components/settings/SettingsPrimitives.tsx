import { ReactNode } from "react";

// ─── Section wrapper ──────────────────────────────────────────────────────────

export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      {title && (
        <p className="text-[11px] font-semibold tracking-widest text-gray-600 uppercase mb-3">
          {title}
        </p>
      )}
      <div className="rounded-2xl overflow-hidden divide-y divide-white/5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

export function SettingsRow({
  label,
  description,
  children,
  danger,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>{label}</p>
        {description && <p className="text-[12px] text-gray-600 mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40
        ${value ? "bg-red-600" : "bg-white/10"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
          ${value ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ─── Radio group ─────────────────────────────────────────────────────────────

export function RadioGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150
            ${value === opt.value
              ? "bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]"
              : "bg-white/8 text-gray-400 hover:bg-white/12 hover:text-white border border-white/8"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────────────────────────

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  formatLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  formatLabel?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 w-44">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #dc2626 ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
        }}
      />
      <span className="text-xs text-gray-500 w-10 text-right tabular-nums">
        {formatLabel ? formatLabel(value) : value}
      </span>
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-white/8 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5
        focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#1c1c1c]">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Danger button ────────────────────────────────────────────────────────────

export function DangerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/30
        hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-150"
    >
      {label}
    </button>
  );
}