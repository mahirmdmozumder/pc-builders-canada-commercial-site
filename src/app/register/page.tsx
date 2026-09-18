import type { Metadata } from 'next';
import { PageShell } from '@/components/ui';
import { RegisterForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a PC Builders Canada account to save builds and track orders.',
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <PageShell className="py-16 sm:py-24">
      <RegisterForm />
    </PageShell>
  );
}
