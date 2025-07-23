import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

const isProduction = process.env.NODE_ENV === 'production';
const external = ['node:http', 'node:https', 'node:http2', 'node:events', 'node:tls', 'node:url']
const modules = ['http', 'http2', 'http2s', 'https']

const mainConfig = modules.map(module => ({
  input: `src/${module}/index.ts`,
  output: [
    {
      format: 'cjs',
      exports: 'auto',
      sourcemap: !isProduction,
      file: `dist/${module}/index.cjs`,
    },
    {
      format: 'esm',
      sourcemap: !isProduction,
      file: `dist/${module}/index.mjs`,
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
  ],
  external,
}))

const tsConfig = modules.map(module => ({
  input: `src/${module}/index.ts`,
  output: { file: `dist/${module}/index.d.ts` },
  plugins: [dts()],
  external,
}))

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
  // ...mainConfig,
  // ...tsConfig,
];  