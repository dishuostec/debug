import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

const dev = process.env.NODE_ENV === 'development';

const input = [
	'src/index.ts',
	'src/lib/debug.ts',
	'src/lib/common.ts',
	'src/lib/runtime/node.ts',
	'src/lib/runtime/browser.ts',
];

export default [
	{
		input: input,
		output: {
			format: 'esm',
			dir: 'dist/esm',
			entryFileNames: '[name].js',
		},
		external: ['ms', 'supports-color'],
		plugins: [
			resolve({
				extensions: ['.js', '.ts'],
			}),
			commonjs(),
			typescript({
				check: false,
			}),
			!dev &&
				terser({
					module: true,
				}),
		],
	},
	{
		input: input,
		output: {
			format: 'cjs',
			dir: 'dist/cjs',
			entryFileNames: '[name].cjs',
			exports: 'auto',
		},
		external: ['ms', 'supports-color'],
		plugins: [
			resolve({
				extensions: ['.js', '.ts'],
			}),
			commonjs(),
			replace({
				include: ['src/index.ts'],
				delimiters: ['', ''],
				values: {
					'await import': 'require',
				},
				preventAssignment: true,
			}),
			typescript({
				check: false,
			}),
			!dev &&
				terser({
					module: true,
				}),
		],
	},
];
