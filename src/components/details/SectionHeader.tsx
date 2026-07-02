// src/components/details/SectionHeader.tsx

interface SectionHeaderProps {
  title: string;
  subtitle?: string | number;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-xl md:text-2xl font-bold text-white drop-shadow-md tracking-wide relative">
        {title}
        <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-[var(--color-accent)] rounded-full shadow-[0_0_8px_var(--color-accent-glow)]" />
      </h2>
      {subtitle !== undefined && (
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {subtitle}
        </span>
      )}
    </div>
  );
}