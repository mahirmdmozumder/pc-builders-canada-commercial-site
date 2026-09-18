import type { Metadata } from 'next';
import { ProfileForm } from '@/components/account/profile-form';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await requireUser('/account/profile');
  return <ProfileForm profile={user.profile} email={user.email} />;
}
