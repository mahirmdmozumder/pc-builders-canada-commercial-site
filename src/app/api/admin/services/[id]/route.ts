import { archiveHandler, updateHandler } from '@/lib/api/cms-routes';
import { adminServiceEditSchema } from '@/lib/validation/schemas';
import { serviceResource } from '@/lib/api/resources';

export const PATCH = updateHandler(serviceResource, adminServiceEditSchema);
export const DELETE = archiveHandler(serviceResource);
