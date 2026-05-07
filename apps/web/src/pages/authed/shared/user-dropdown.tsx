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

export function UserDropdown({ user, links = defaultLinks, onLogOut }: UserDropdownProps) {
  const displayName = user.displayName ?? user.email

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="group flex min-w-0 items-center gap-3 px-2 py-1 text-left hover:bg-muted"
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
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
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

  const backgroundColor = useMemo(() => {
    const source = user.id || user.email
    let hash = 0
    for (let index = 0; index < source.length; index += 1) {
      hash = source.charCodeAt(index) + hash * 31
    }

    const colors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']
    return colors[Math.abs(hash) % colors.length]
  }, [user.id, user.email])

  return (
    <div
      className={cn(
        'relative size-8 shrink-0 overflow-hidden rounded-full after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten',
        className,
      )}
    >
      {(!imageUrl || imageError || !imageLoaded) && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-sm font-medium text-primary-foreground',
            backgroundColor,
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
