/*
 * Copies the OpenAPI document of the API into openapi/sapio.json, which the build reads (lib/openapi.ts).
 * Run: pnpm sync:openapi [path to openapi.json]   (default: ../datn-saas/apps/api/openapi.json)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'openapi/sapio.json');
const from = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(root, '../datn-saas/apps/api/openapi.json');

function fail(message: string): never {
  console.error(`sync:openapi: ${message}`);
  process.exit(1);
}

if (!existsSync(from)) {
  fail(
    `không thấy ${from}. Truyền đường dẫn tới openapi.json: pnpm sync:openapi <đường dẫn>, hoặc chạy ` +
      `"pnpm --filter @datn/api openapi:export" ở datn-saas trước.`,
  );
}

let spec: { openapi?: unknown; paths?: Record<string, unknown> };
try {
  spec = JSON.parse(readFileSync(from, 'utf8'));
} catch (error) {
  fail(`${from} không phải JSON: ${(error as Error).message}`);
}
if (typeof spec.openapi !== 'string' || typeof spec.paths !== 'object' || spec.paths === null) {
  fail(`${from} không phải tài liệu OpenAPI (thiếu "openapi" hoặc "paths").`);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(from, target);
console.log(`sync:openapi: ${from} -> ${target} (${Object.keys(spec.paths).length} path)`);
