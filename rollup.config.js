import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';

const external = ['node:http', 'node:https', 'node:http2', 'node:events', 'node:tls', 'node:url']

export default [
  {
    input: {
      http: 'src/http/index.ts',
      http2: 'src/http2/index.ts',
      http2s: 'src/http2s/index.ts',
      https: 'src/https/index.ts',
    },
    output: [
      {
        format: 'cjs',
        exports: 'auto',
        dir: 'dist/cjs',
        chunkFileNames: 'core.cjs',
      },
      {
        format: 'esm',
        dir: 'dist/esm',
        chunkFileNames: 'core.cjs',
      }
    ],
    plugins: [
      json(),
      resolve(),
      commonjs(),
      typescript(),
    ],
    external,
  },
  {
    input: {
      http: 'src/http/index.ts',
      http2: 'src/http2/index.ts',
      http2s: 'src/http2s/index.ts',
      https: 'src/https/index.ts',
    },
    output: { dir: 'dist', chunkFileNames: 'core.d.ts' },
    plugins: [dts()],
    external,
  }
];  