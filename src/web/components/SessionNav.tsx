'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { currentSession, SessionUser, signOut } from '../lib/api';

const LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/employees', label: 'People' },
];

// The navigation only offers what the signed-in user can actually open, so no link leads to
// a screen that does not exist yet (Constitution I).
export default function SessionNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    currentSession()
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname]);

  if (!user) return null;

  async function leave() {
    await signOut();
    setUser(null);
    router.replace('/login');
  }

  return (
    <>
      <div className="nav-links">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname.startsWith(link.href) ? 'current' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="nav-session">
        <p className="who">{user.displayName}</p>
        <p className="muted">
          {user.role === 'ADMINISTRATOR' ? 'Administrator' : 'Project Manager'}
        </p>
        <button type="button" className="secondary" onClick={leave}>
          Sign out
        </button>
      </div>
    </>
  );
}
