import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Activity, LayoutDashboard, ListOrdered, Radio, Plug, Network, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavbarProps {
  theme: string
  toggleTheme: () => void
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/queues', label: 'Queues', icon: ListOrdered },
  { href: '/topics', label: 'Topics', icon: Radio },
  { href: '/connections', label: 'Connections', icon: Plug },
  { href: '/network', label: 'Network', icon: Network },
  { href: '/scheduled', label: 'Scheduled', icon: Clock },
]

export function Navbar({ theme, toggleTheme }: NavbarProps) {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2 mr-8">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">ActiveMQ Dashboard</span>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} to={href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-2',
                  (href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)) && 'bg-accent text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
