import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

const isProduction = process.env.NODE_ENV === 'production';
const external = ['node:http', 'node:https', 'node:http2', 'node:events', 'node:tls', 'node:url']

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        format: 'cjs',
        exports: 'auto',
        sourcemap: !isProduction,
        file: 'dist/index.cjs',
      },
      {
        format: 'esm',
        sourcemap: !isProduction,
        file: 'dist/index.mjs',
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
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts' },
    plugins: [dts()],
    external,
  }
];  