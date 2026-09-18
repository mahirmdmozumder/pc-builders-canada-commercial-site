import { z } from 'zod';
import { resolveCart } from '@/lib/cart/summary';
import { checkoutLineSchema } from '@/lib/validation/schemas';
import { PROVINCE_TAXES } from '@/lib/pricing/tax';
import { handle, ok, zodErrorResponse } from '@/lib/api/respond';

const provinceCodes = Object.keys(PROVINCE_TAXES) as [string, ...string[]];

/**
 * Prices a cart without creating anything.
 *
 * The cart page calls this on every change so the figures a customer sees come
 * from the same server-side calculation the checkout will use, rather than
 * from client arithmetic that could drift.
 */
const summarySchema = z.object({
  lines: z.array(checkoutLineSchema).max(20),
  province: z.enum(provinceCodes),
});

export async function POST(request: Request) {
  return handle('POST /api/cart/summary', async () => {
    const parsed = summarySchema.safeParse(await request.json());
    if (!parsed.success) return zodErrorResponse(parsed.error);

    if (parsed.data.lines.length === 0) {
      return ok({ lines: [], price: null, problems: [] });
    }

    const resolved = await resolveCart({
      lines: parsed.data.lines,
      province: parsed.data.province,
    });

    return ok(resolved);
  });
}
