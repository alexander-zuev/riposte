import { Logo } from '@web/ui/components/ui/logo'

const productLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Get Started', href: '/sign-in' },
]

const resourceLinks = [{ label: 'GitHub', href: 'https://github.com/alexander-zuev/riposte' }]

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-max-w-5xl py-16 md:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo variant="full" size="sm" href="/" />
            <p className="mt-3 text-sm font-normal text-primary-foreground/60">
              Open-source AI agent that wins Stripe disputes on autopilot.
            </p>
          </div>

          <LinkColumn title="Product" links={productLinks} />
          <LinkColumn title="Resources" links={resourceLinks} />
          <LinkColumn title="Legal" links={legalLinks} />
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-8 md:flex-row">
          <small className="text-primary-foreground/40">
            &copy; {new Date().getFullYear()} Riposte. All rights reserved.
          </small>
          <small className="text-primary-foreground/40">AGPLv3 Licensed</small>
        </div>
      </div>
    </footer>
  )
}

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
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
              className="text-sm font-normal text-primary-foreground/60 no-underline transition-colors hover:text-primary-foreground hover:no-underline"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
