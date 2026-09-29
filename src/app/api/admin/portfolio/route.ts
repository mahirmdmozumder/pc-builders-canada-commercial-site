import { createHandler } from '@/lib/api/cms-routes';
import { adminPortfolioSchema } from '@/lib/validation/schemas';
import { portfolioResource } from '@/lib/api/resources';

export const POST = createHandler(portfolioResource, adminPortfolioSchema);
