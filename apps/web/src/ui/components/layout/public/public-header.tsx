import { SignInIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type { AuthUser } from '@web/entities/auth/auth-user'
import { useSignOutMutation } from '@web/entities/auth/use-sign-out-mutation'
import { UserDropdown } from '@web/pages/authed/shared/user-dropdown'
import { buttonVariants } from '@web/ui/components/ui/button'
import { Logo } from '@web/ui/components/ui/logo'

interface PublicHeaderProps {
  user: AuthUser | null
}

// Absolute `/#...` so the links also work from the legal pages, not just the landing.
const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
]

const navLinkClass =
  'text-sm text-muted-foreground no-underline transition-colors hover:text-foreground hover:no-underline'

/** Shared top bar for public marketing/legal pages (everything under `_public` except sign-in). */
export function PublicHeader({ user }: PublicHeaderProps) {
  const signOutMutation = useSignOutMutation()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-md">
      <div className="container-max-w-6xl flex h-16 items-center justify-between gap-6">
        <Logo variant="full" size="sm" href="/" />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
            </a>
          ))}
        </nav>

        {user ? (
          <UserDropdown user={user} onLogOut={() => signOutMutation.mutate()} />
        ) : (
          <Link to="/sign-in" aria-label="Sign in" className={buttonVariants({ size: 'sm' })}>
            <SignInIcon data-icon="inline-start" />
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
