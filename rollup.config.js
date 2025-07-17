const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const typescript = require('@rollup/plugin-typescript');
const { dts } = require('rollup-plugin-dts');

const isProduction = process.env.NODE_ENV === 'production';
const external = ['node:http', 'node:https', 'node:http2', 'node:events', 'node:tls', 'node:url']

module.exports = [
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