import { defineDocs } from 'fumadocs-mdx/macro';
import { loader, type LoaderPlugin } from 'fumadocs-core/source';
import { openapi, SPEC_PATH } from '@/lib/openapi';

const docs = defineDocs({
  dir: 'content/docs',
});

/** One page per endpoint, at /docs/api/reference/<tag>/<operationId>. */
const REFERENCE_DIR = 'api/reference';

const { bundled } = await openapi.getSchema(SPEC_PATH);

/** Folder path of each tag -> its description. The folder name is the tag name, as fumadocs-openapi slugs it. */
const tagTitles = new Map<string, string>();
for (const { name, description } of bundled.tags ?? []) {
  if (name && description) {
    tagTitles.set(`${REFERENCE_DIR}/${name.replace(/\s+/g, '-').toLowerCase()}`, description);
  }
}

/** The folder of a tag shows the description of the tag in the menu, not its technical name. */
const tagFolderTitles: LoaderPlugin = {
  name: 'sapio:tag-folder-titles',
  transformPageTree: {
    folder(node, folderPath) {
      const title = tagTitles.get(folderPath);
      return title === undefined ? node : { ...node, name: title };
    },
  },
};

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({ baseDir: REFERENCE_DIR, groupBy: 'tag' }),
  },
  {
    baseUrl: '/docs',
    plugins: [openapi.loaderPlugin(), tagFolderTitles],
  },
);
