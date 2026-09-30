import { getSessionUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/env';
import { getOwnReview, hasPurchased } from '@/lib/reviews/repository';
import { handle, ok } from '@/lib/api/respond';

/**
 * The viewer's own review standing for one product.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A ROUTE AND NOT PART OF THE PAGE
 * ---------------------------------------------------------------------------
 * The product page read this directly at first, and that quietly made the whole
 * route dynamic. Reading cookies anywhere in a server component opts the entire
 * page out of static rendering — so every visitor, including every crawler, got a
 * fresh server render with a database round trip, and the `revalidate` window on
 * the page did nothing at all.
 *
 * That is a bad trade for a panel that says either "sign in to review" or "here
 * is your review". So the page stays statically generated and cached, and this
 * one per-visitor fact is fetched by the browser afterwards.
 *
 * It is the same reasoning as useClientSession: keep the cookie read out of the
 * page so the page can be cached, and fetch the session-dependent chrome
 * separately.
 *
 * Nothing here is authorization. The answer is about the caller and only the
 * caller: getOwnReview reads through the session client, so RLS scopes it to
 * their own row regardless of what component_id is asked for.
 */
export async function GET(request: Request) {
  return handle('GET /api/reviews/mine', async () => {
    const componentId = new URL(request.url).searchParams.get('component_id');
    if (!componentId) {
      // Not a 400. The caller is a UI panel, and "no product asked about" and
      // "nothing to report" are the same outcome for it.
      return ok({ signedIn: false, review: null, purchased: false });
    }

    if (!isSupabaseConfigured) {
      return ok({ signedIn: false, review: null, purchased: false, accounts: false });
    }

    const user = await getSessionUser();
    if (!user) {
      return ok({ signedIn: false, review: null, purchased: false, accounts: true });
    }

    const [review, purchased] = await Promise.all([
      getOwnReview(componentId),
      hasPurchased(componentId),
    ]);

    return ok({
      signedIn: true,
      accounts: true,
      review,
      purchased,
      // A suggestion for the display-name input, shortened to a first name and an
      // initial. Publishing somebody's full legal name because it happens to be
      // on their account is not a decision to make for them.
      suggestedName: suggestName(user.profile?.full_name ?? null),
    });
  });
}

function suggestName(fullName: string | null): string | null {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
