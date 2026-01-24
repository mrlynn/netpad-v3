import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/nodes/index.ts',
    'src/edges/index.ts',
    'src/themes/index.ts',
    'src/layout/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2020',
  external: ['react', 'react-dom'],
});
