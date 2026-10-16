/** Símbolo do Tumtum: o coração da mãe, o do bebê e a batida. Cores fixas da marca. */
export default function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="16 44 184 120" className={className} aria-hidden>
      <path d="M74 156 C34 128 16 102 27 77 C38 52 66 54 74 76 C82 54 110 52 121 77 C132 102 114 128 74 156Z" fill="#c8607a" />
      <path d="M118 134 C98 121 89 108 95 96 C100 85 113 86 118 97 C123 86 136 85 141 96 C147 108 138 121 118 134Z" fill="#f0b23e" stroke="var(--c-surface, #fff)" strokeWidth={5} paintOrder="stroke" />
      <path d="M150 72 C165 86 169 110 157 130" fill="none" stroke="#5f93b8" strokeWidth={11} strokeLinecap="round" />
      <path d="M168 54 C192 79 195 118 177 145" fill="none" stroke="#5f93b8" strokeWidth={11} strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}
