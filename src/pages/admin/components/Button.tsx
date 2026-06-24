import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary:
    'bg-white text-black hover:bg-white/90 disabled:bg-white/40 disabled:text-black/60',
  secondary:
    'border border-white/20 text-white/80 hover:border-white/40 hover:text-white disabled:opacity-40',
  danger:
    'bg-red-500/90 text-white hover:bg-red-500 disabled:bg-red-500/40',
  ghost:
    'text-white/60 hover:text-white disabled:opacity-40',
};

const Button = ({
  variant = 'secondary',
  children,
  className = '',
  type = 'button',
  ...rest
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  // eslint-disable-next-line react/button-has-type
  <button
    type={type}
    {...rest}
    className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium tracking-wider uppercase transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
  >
    {children}
  </button>
);

export default Button;
