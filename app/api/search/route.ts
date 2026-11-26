import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

/**
 * A reference page has only a title of its own, so it ranks below any page with many matching chunks.
 * It is indexed with its route and the descriptions of its responses as well.
 */
export const { GET } = createFromSource(source, {
  buildIndex: (page) => {
    const base = {
      id: page.url,
      title: page.data.title ?? page.url,
      url: page.url,
      ...(page.data.description === undefined ? {} : { description: page.data.description }),
    };
    if (page.type !== 'openapi') return { ...base, structuredData: page.data.structuredData };

    const { bundled } = page.data.getSchema();
    const contents: { content: string; heading: string | undefined }[] = [];
    for (const { path, method } of page.data.getOpenAPIPageProps().operations ?? []) {
      contents.push({
        content: `${base.title}. ${method.toUpperCase()} ${path}`,
        heading: undefined,
      });
      for (const response of Object.values(bundled.paths?.[path]?.[method]?.responses ?? {})) {
        if ('description' in response && response.description) {
          contents.push({ content: response.description, heading: undefined });
        }
      }
    }
    return { ...base, structuredData: { headings: [], contents } };
  },
});
