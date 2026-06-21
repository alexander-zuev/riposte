import { GithubLogoIcon, type Icon } from '@phosphor-icons/react'
import { Logo } from '@web/ui/components/ui/logo'

const GITHUB_URL = 'https://github.com/alexander-zuev/riposte'

type FooterLink = { label: string; href: string; icon?: Icon }

// Anchors are absolute (`/#...`) so they also work from legal pages, not just the landing page.
const productLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Get started', href: '/sign-in' },
]

const resourceLinks: FooterLink[] = [{ label: 'GitHub', href: GITHUB_URL, icon: GithubLogoIcon }]

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Sub-processors', href: '/sub-processors' },
]

/** Shared footer for public marketing/legal pages. */
export function PublicFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-max-w-6xl py-16 md:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo variant="full" size="sm" href="/" />
            <p className="mt-3 text-sm font-normal text-primary-foreground/60">
              Open-source AI agent that fights Stripe disputes on autopilot.
            </p>
          </div>

          <LinkColumn title="Product" links={productLinks} />
          <LinkColumn title="Resources" links={resourceLinks} />
          <LinkColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-14 border-t border-primary-foreground/10 pt-8 text-center">
          <small className="text-primary-foreground/40">
            &copy; {new Date().getFullYear()} Riposte. All rights reserved.
          </small>
        </div>
      </div>
    </footer>
  )
}

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h6 className="text-sm font-medium tracking-wider text-primary-foreground/40 uppercase">
        {title}
      </h6>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="inline-flex items-center gap-1.5 text-sm font-normal text-primary-foreground/60 no-underline transition-colors hover:text-primary-foreground hover:no-underline"
            >
              {l.icon ? <l.icon className="size-4" aria-hidden="true" /> : null}
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
