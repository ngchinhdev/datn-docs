import { createOpenAPI } from 'fumadocs-openapi/server';

/** The API document, copied by `pnpm sync:openapi`; the build reads only this file. */
export const SPEC_PATH = './openapi/sapio.json';

export const openapi = createOpenAPI({ input: [SPEC_PATH] });
