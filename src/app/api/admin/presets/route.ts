import { createHandler } from '@/lib/api/cms-routes';
import { adminPresetSchema } from '@/lib/validation/schemas';
import { presetResource } from '@/lib/api/resources';

export const POST = createHandler(presetResource, adminPresetSchema);
