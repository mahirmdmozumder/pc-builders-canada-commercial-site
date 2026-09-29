import { archiveHandler, updateHandler } from '@/lib/api/cms-routes';
import { adminPromotionEditSchema } from '@/lib/validation/schemas';
import { promotionResource } from '@/lib/api/resources';

export const PATCH = updateHandler(promotionResource, adminPromotionEditSchema);
export const DELETE = archiveHandler(promotionResource);
