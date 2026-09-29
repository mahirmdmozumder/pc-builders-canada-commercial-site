import { createHandler } from '@/lib/api/cms-routes';
import { adminServiceSchema } from '@/lib/validation/schemas';
import { serviceResource } from '@/lib/api/resources';

export const POST = createHandler(serviceResource, adminServiceSchema);
