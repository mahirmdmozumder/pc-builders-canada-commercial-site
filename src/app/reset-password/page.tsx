import type { Metadata } from 'next';
import { PageShell } from '@/components/ui';
import { ResetRequestForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <PageShell className="py-16 sm:py-24">
      <ResetRequestForm />
    </PageShell>
  );
}
