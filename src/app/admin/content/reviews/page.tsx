import type { Metadata } from 'next';
import { ReviewsManager } from '@/components/admin/reviews-manager';
import { requireAdmin } from '@/lib/auth/session';
import { listAllReviews } from '@/lib/reviews/repository';

export const metadata: Metadata = { title: 'Reviews' };
export const dynamic = 'force-dynamic';

/**
 * Review moderation.
 *
 * Part of the existing admin, not a second system: same layout, same auth check,
 * same activity logging as every other content screen.
 *
 * The role is verified here before the query runs, and the query itself goes
 * through the session client so the table's RLS policy checks it again. A caller
 * that somehow got past requireAdmin() would come back with their own reviews and
 * nothing else.
 */
export default async function AdminReviewsPage() {
  await requireAdmin();
  const reviews = await listAllReviews();
  return <ReviewsManager reviews={reviews} />;
}
