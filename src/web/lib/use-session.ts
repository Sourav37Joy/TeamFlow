'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiFailure, currentSession, SessionUser } from './api';

// Every screen behind the sign-in wall asks who is signed in before it renders, and sends
// an unauthenticated visitor to the sign-in page rather than showing an empty shell (FR-082).
export function useSession(): { user: SessionUser | null; loading: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    currentSession()
      .then((session) => {
        if (live) setUser(session);
      })
      .catch((failure) => {
        if (failure instanceof ApiFailure && failure.status === 401) router.replace('/login');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [router]);

  return { user, loading };
}
