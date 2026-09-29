import { archiveHandler, updateHandler } from '@/lib/api/cms-routes';
import { adminPresetEditSchema } from '@/lib/validation/schemas';
import { presetResource } from '@/lib/api/resources';

export const PATCH = updateHandler(presetResource, adminPresetEditSchema);
export const DELETE = archiveHandler(presetResource);
