import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
