import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: ButtonProps) {
  const styles = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700',
    secondary: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
    ghost: 'text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400',
    danger: 'text-cancelled hover:bg-red-50 focus-visible:outline-cancelled',
  }[variant]
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        styles,
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200', className)}>{children}</div>
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

export function Field({ label, hint, id, className, ...rest }: FieldProps) {
  const inputId = id ?? rest.name
  return (
    <label htmlFor={inputId} className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={inputId}
        className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-700 focus:outline-none"
        {...rest}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'brand' | 'due' | 'paid'; children: ReactNode }) {
  const styles = {
    slate: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-100 text-brand-800',
    due: 'bg-amber-100 text-amber-800',
    paid: 'bg-green-100 text-green-800',
  }[tone]
  return <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', styles)}>{children}</span>
}

export function Alert({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'bg-red-50 text-red-800 ring-red-200',
    success: 'bg-green-50 text-green-800 ring-green-200',
    info: 'bg-brand-50 text-brand-800 ring-brand-100',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-lg px-4 py-3 text-sm ring-1', styles)}>
      {children}
    </div>
  )
}

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent',
        small ? 'h-4 w-4' : 'h-8 w-8 text-brand-700',
      )}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" aria-label="Loading">
      <Spinner />
    </div>
  )
}
