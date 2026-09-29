import { archiveHandler, updateHandler } from '@/lib/api/cms-routes';
import { adminPortfolioEditSchema } from '@/lib/validation/schemas';
import { portfolioResource } from '@/lib/api/resources';

export const PATCH = updateHandler(portfolioResource, adminPortfolioEditSchema);
export const DELETE = archiveHandler(portfolioResource);
