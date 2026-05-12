import {
  CaretDownIcon,
  CreditCardIcon,
  SignOutIcon,
  UserIcon,
  type Icon,
} from '@phosphor-icons/react'
import { buildImageProxyUrl } from '@riposte/core/client'
import { Link } from '@tanstack/react-router'
import type { AuthUser } from '@web/entities/auth/auth-user'
import { cn } from '@web/lib/utils'
import { Button } from '@web/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/ui/components/ui/dropdown-menu'
import type * as React from 'react'
import { useCallback, useMemo, useState } from 'react'

interface UserDropdownLink {
  label: string
  to: React.ComponentProps<typeof Link>['to']
  icon: Icon
}

interface UserDropdownProps {
  user: AuthUser
  links?: readonly UserDropdownLink[]
  onLogOut: () => void | Promise<void>
}

const defaultLinks = [
  {
    label: 'Account',
    to: '/account',
    icon: UserIcon,
  },
  {
    label: 'Billing',
    to: '/billing',
    icon: CreditCardIcon,
  },
] satisfies readonly UserDropdownLink[]

const defaultFallbackAvatarTone = {
  border: 'after:border-lime-6',
  surface: 'bg-accent-muted',
  text: 'text-accent-muted-foreground',
}

export function UserDropdown({ user, links = defaultLinks, onLogOut }: UserDropdownProps) {
  const displayName = user.displayName ?? user.email

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="group h-auto w-56 min-w-0 justify-start gap-3 px-2 py-1 text-left"
            aria-label="Open user menu"
          />
        }
      >
        <UserAvatar user={user} />
        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <CaretDownIcon className="size-3 shrink-0 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        {links.map((item) => {
          const ItemIcon = item.icon

          return (
            <DropdownMenuItem
              key={`${item.to}-${item.label}`}
              render={<Link to={item.to} className="no-underline hover:no-underline" />}
            >
              <ItemIcon className="size-4 text-muted-foreground" />
              {item.label}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogOut} variant="destructive">
          <SignOutIcon className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function UserAvatar({ user, className }: { user: AuthUser; className?: string }) {
  const imageUrl = buildImageProxyUrl('', user.avatarUrl)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const handleImageLoad = useCallback(() => setImageLoaded(true), [])
  const handleImageError = useCallback(() => setImageError(true), [])

  const fallbackAvatarTone = useMemo(() => {
    const source = user.id || user.email
    let hash = 0
    for (let index = 0; index < source.length; index += 1) {
      hash = source.charCodeAt(index) + hash * 31
    }

    const tones = [
      defaultFallbackAvatarTone,
      {
        border: 'after:border-orange-6',
        surface: 'bg-warning-muted',
        text: 'text-warning-muted-foreground',
      },
      {
        border: 'after:border-jade-6',
        surface: 'bg-success-muted',
        text: 'text-success-muted-foreground',
      },
      {
        border: 'after:border-iris-6',
        surface: 'bg-info-muted',
        text: 'text-info-muted-foreground',
      },
      {
        border: 'after:border-red-6',
        surface: 'bg-destructive-muted',
        text: 'text-destructive-muted-foreground',
      },
    ]
    return tones[Math.abs(hash) % tones.length] ?? defaultFallbackAvatarTone
  }, [user.id, user.email])

  return (
    <div
      className={cn(
        'relative size-8 shrink-0 overflow-hidden rounded-full after:absolute after:inset-0 after:rounded-full after:border after:mix-blend-darken dark:after:mix-blend-lighten',
        imageUrl && !imageError ? 'after:border-border' : fallbackAvatarTone.border,
        className,
      )}
    >
      {(!imageUrl || imageError || !imageLoaded) && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-sm font-medium',
            fallbackAvatarTone.surface,
            fallbackAvatarTone.text,
          )}
          aria-label={`${user.email}'s avatar`}
        >
          {user.initials}
        </div>
      )}

      {imageUrl && !imageError && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  )
}
