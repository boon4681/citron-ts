import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import * as tsup from 'tsup';
import pkg from './package.json';

esbuild.buildSync({
	entryPoints: ['./src/cli.ts'],
	bundle: true,
	outfile: 'dist/cli.js',
	format: 'cjs',
	target: 'node20',
	platform: 'node',
	external: [
		'esbuild'
	],
	banner: {
		js: `#!/usr/bin/env node`,
	},
});

const main = async () => {
	await tsup.build({
		entryPoints: ['./src/index.ts'],
		outDir: './dist',
		external: ['bun:sqlite'],
		splitting: false,
		dts: true,
		format: ['cjs', 'esm'],
		outExtension: (ctx) => {
			if (ctx.format === 'cjs') {
				return {
					dts: '.d.ts',
					js: '.js',
				};
			}
			return {
				dts: '.d.mts',
				js: '.mjs',
			};
		},
	});
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});