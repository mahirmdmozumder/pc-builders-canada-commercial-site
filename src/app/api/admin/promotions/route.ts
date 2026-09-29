import { createHandler } from '@/lib/api/cms-routes';
import { adminPromotionSchema } from '@/lib/validation/schemas';
import { promotionResource } from '@/lib/api/resources';

export const POST = createHandler(promotionResource, adminPromotionSchema);
