import { useEffect, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { coverUrl, formatScore, gradeColor, gradeLabel } from '../lib/utils'

/* ---------------- Icons ---------------- */
type IconProps = { className?: string }
const S = (p: IconProps, d: ReactNode, extra?: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className || 'h-4 w-4'}
    aria-hidden="true"
  >
    {d}
    {extra}
  </svg>
)

export const IconSearch = (p: IconProps) =>
  S(p, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>)
export const IconPlus = (p: IconProps) => S(p, <><path d="M12 5v14" /><path d="M5 12h14" /></>)
export const IconClose = (p: IconProps) => S(p, <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>)
export const IconChevron = (p: IconProps) => S(p, <path d="m6 9 6 6 6-6" />)
export const IconFilter = (p: IconProps) =>
  S(p, <><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></>)
export const IconUpload = (p: IconProps) =>
  S(p, <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>)
export const IconImage = (p: IconProps) =>
  S(p, <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>)
export const IconDownload = (p: IconProps) =>
  S(p, <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>)
export const IconDatabase = (p: IconProps) =>
  S(p, <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>)
export const IconTrash = (p: IconProps) =>
  S(p, <><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>)
export const IconEdit = (p: IconProps) =>
  S(p, <><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>)
export const IconGrip = (p: IconProps) =>
  S(p, <><circle cx="9" cy="7" r="1.2" /><circle cx="15" cy="7" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="17" r="1.2" /><circle cx="15" cy="17" r="1.2" /></>)
export const IconExternal = (p: IconProps) =>
  S(p, <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>)
export const IconGrid = (p: IconProps) =>
  S(p, <><rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" /><rect x="3" y="14" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" /></>)
export const IconTrophy = (p: IconProps) =>
  S(p, <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3" /><path d="M12 12v4" /><path d="M8 20h8" /><path d="M10 16h4l1 4H9l1-4Z" /></>)
export const IconCheck = (p: IconProps) => S(p, <path d="m5 13 4 4L19 7" />)

/* ---------------- Button ---------------- */
type Variant = 'primary' | 'ghost' | 'soft' | 'danger' | 'text'
type Size = 'sm' | 'md' | 'lg'

const VAR: Record<Variant, string> = {
  primary: 'bg-gold text-[#15130c] hover:bg-[#f1d284] shadow-[0_2px_10px_rgba(233,196,106,0.18)]',
  ghost:
    'border border-line bg-white/[0.03] text-ink hover:bg-white/[0.07] hover:border-white/25',
  soft: 'bg-white/[0.06] text-ink hover:bg-white/[0.11]',
  danger: 'border border-[#5a2a2b] bg-[#2a1618] text-[#e59a94] hover:bg-[#351b1d]',
  text: 'text-muted hover:text-ink',
}
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-[13.5px] rounded-xl gap-2',
  lg: 'h-11 px-5 text-[14px] rounded-xl gap-2',
}

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...rest}
      className={`inline-flex select-none items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${SIZE[size]} ${VAR[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.07] hover:text-ink ${className}`}
    >
      {children}
    </button>
  )
}

/* ---------------- Select ---------------- */
export function Select({
  value,
  onChange,
  options,
  className = '',
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
  ariaLabel?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-line bg-panel-2 pl-3 pr-8 text-[13px] text-ink outline-none transition-colors hover:border-white/20 focus:border-gold/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <IconChevron className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  )
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div className={`inline-flex rounded-xl border border-line bg-panel p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-7 rounded-lg px-3 text-[12.5px] transition-colors ${
              active ? 'bg-white/[0.12] text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  children,
  width = 'max-w-2xl',
  className = '',
  z = 'z-50',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: string
  className?: string
  z?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className={`fixed inset-0 ${z} flex items-center justify-center p-3 sm:p-6`}>
      <div className="anim-fade absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`anim-pop relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel-2 shadow-[0_30px_80px_rgba(0,0,0,0.6)] ${width} ${className}`}
      >
        {children}
      </div>
    </div>
  )
}

/* ---------------- Confirm ---------------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} width="max-w-[380px]">
      <div className="p-6">
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Toast ---------------- */
export function Toast({ toast }: { toast: { msg: string; kind: 'ok' | 'err' } | null }) {
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed bottom-7 left-1/2 z-[90] -translate-x-1/2">
      <div
        className={`anim-pop flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] shadow-2xl backdrop-blur ${
          toast.kind === 'err'
            ? 'border-[#5a2a2a] bg-[#2a1618]/95 text-[#f0b1ab]'
            : 'border-white/12 bg-[#1b1b21]/95 text-ink'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${toast.kind === 'err' ? 'bg-[#e07a72]' : 'bg-gold'}`}
        />
        {toast.msg}
      </div>
    </div>
  )
}

/* ---------------- Grade badge ---------------- */
export function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' }) {
  if (!grade) {
    return (
      <span className="inline-flex h-6 items-center rounded-md border border-white/12 px-1.5 text-[11px] text-muted">
        未评级
      </span>
    )
  }
  const color = gradeColor(grade)
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-semibold ${
        size === 'sm' ? 'h-5 w-5 text-[11px]' : 'h-6 min-w-6 px-1.5 text-[12.5px]'
      }`}
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}14` }}
      title={gradeLabel(grade)}
    >
      {grade}
    </span>
  )
}

/* ---------------- Cover ---------------- */
export function Cover({
  file,
  name,
  className = '',
  rounded = 'rounded-[11px]',
}: {
  file: string | null
  name: string
  className?: string
  rounded?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [file])
  const url = coverUrl(file)

  if (!url || failed) {
    const mark = name.trim().slice(0, 1).toUpperCase()
    return (
      <div
        className={`relative isolate flex items-center justify-center overflow-hidden bg-[#0e0e12] ${rounded} ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_50%_-5%,#24242c_0%,#141419_55%,#0a0a0d_100%)]" />
        
        {mark ? (
          <div className="relative flex flex-col items-center gap-2">
            <span className="font-display text-[13px] tracking-[0.32em] text-white/20">{mark}</span>
            <span className="h-px w-5 bg-white/15" />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-panel ${rounded} ${className}`}>
      <img
        src={url}
        alt={name}
        draggable={false}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

/* ---------------- Misc ---------------- */
export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[12px] tracking-wide text-muted">{children}</span>
}

export function ScoreText({ score, className = '' }: { score: number | null; className?: string }) {
  return (
    <span className={className}>
      {score == null ? (
        <span className="text-muted">未评分</span>
      ) : (
        <span className="tabular-nums">{formatScore(score)}</span>
      )}
    </span>
  )
}
