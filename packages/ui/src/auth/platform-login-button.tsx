'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ChzzkMark, SoopMark } from '../brand/icons'
import { type BrandPlatform, platformLabel } from '../brand/tokens'
import { cn } from '../lib/utils'

export interface PlatformLoginButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  platform: BrandPlatform
  href?: string
  size?: 'default' | 'lg'
  fullWidth?: boolean
  children?: ReactNode
}

function PlatformMark({ platform, className }: { platform: BrandPlatform; className?: string }) {
  if (platform === 'chzzk') {
    return <ChzzkMark className={className} />
  }
  return <SoopMark className={className} />
}

export function PlatformLoginButton({
  platform,
  href,
  size = 'default',
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: PlatformLoginButtonProps) {
  const label = children ?? `${platformLabel(platform)}으로 로그인`

  const classes = cn(
    'inline-flex items-center justify-center gap-2.5 rounded-md border border-neutral-200 bg-white text-sm font-semibold shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    size === 'lg' ? 'h-12 px-5' : 'h-10 px-4',
    fullWidth && 'w-full',
    disabled && 'pointer-events-none opacity-50',
    className,
  )

  // Demo `a { color: inherit }` is unlayered and beats Tailwind text utilities.
  const labelColor = '#3f3f46'

  const markClass = platform === 'chzzk' ? 'h-4 w-[5.5rem] shrink-0' : 'h-5 w-[2.6rem] shrink-0'

  const content = (
    <>
      <PlatformMark platform={platform} className={markClass} />
      <span style={{ color: labelColor }}>{label}</span>
    </>
  )

  if (href) {
    return (
      <a
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={classes}
        style={{ color: labelColor }}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      {...props}
      style={{ color: labelColor, ...props.style }}
    >
      {content}
    </button>
  )
}
