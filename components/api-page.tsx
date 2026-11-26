'use client';

import { createOpenAPIPage } from 'fumadocs-openapi/ui';

/** No "try it": the deployed docs cannot reach localhost. Trying calls is done in Scalar (apps/api, /docs). */
export const OpenAPIPage = createOpenAPIPage({ playground: { enabled: false } });
