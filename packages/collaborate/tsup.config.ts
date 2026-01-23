import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/index': 'src/components/index.ts',
    'nodes/index': 'src/nodes/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next',
    'next/server',
    '@mui/material',
    '@mui/icons-material',
  ],
  treeshake: true,
  splitting: false,
  sourcemap: true,
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
});
