import Link from 'next/link';
import SignOutButton from './SignOutButton';

const LINKS = [
  { href: '/', label: 'Dispatch Board' },
  { href: '/properties', label: 'Properties' },
  { href: '/checklist-templates', label: 'Checklist Templates' },
];

export default function Nav() {
  return (
    <nav className="border-b border-line bg-paper">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-display font-bold">CleanWorks Pro</span>
          <div className="flex items-center gap-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-graphite hover:text-ink transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <SignOutButton />
      </div>
    </nav>
  );
}
