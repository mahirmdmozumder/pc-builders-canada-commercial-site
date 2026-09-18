import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageShell } from '@/components/ui';
import { LoginForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your PC Builders Canada account.',
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <PageShell className="py-16 sm:py-24">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PageShell>
  );
}
