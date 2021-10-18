/// <reference types="node" />
import type { InspectOptions } from 'node:util';
import tty from 'tty';
import util from 'util';
import type { Formatter } from '../../types';
import type { Debug } from '../debug';

interface NodeDebugEnv extends Debug {
	inspectOpts: InspectOptions;
}

export const colors = [6, 2, 3, 4, 5, 1];

export function supportsColor(): void {
	colors.splice(
		0,
		colors.length,
		20,
		21,
		26,
		27,
		32,
		33,
		38,
		39,
		40,
		41,
		42,
		43,
		44,
		45,
		56,
		57,
		62,
		63,
		68,
		69,
		74,
		75,
		76,
		77,
		78,
		79,
		80,
		81,
		92,
		93,
		98,
		99,
		112,
		113,
		128,
		129,
		134,
		135,
		148,
		149,
		160,
		161,
		162,
		163,
		164,
		165,
		166,
		167,
		168,
		169,
		170,
		171,
		172,
		173,
		178,
		179,
		184,
		185,
		196,
		197,
		198,
		199,
		200,
		201,
		202,
		203,
		204,
		205,
		206,
		207,
		208,
		209,
		214,
		215,
		220,
		221,
	);
}

const inspectOpts: InspectOptions = Object.keys(process.env)
	.filter((key) => {
		return /^debug_/i.test(key);
	})
	.reduce((obj: Record<string, unknown>, key) => {
		// Camel-case
		const prop = key
			.substring(6)
			.toLowerCase()
			.replace(/_([a-z])/g, (_, k) => {
				return k.toUpperCase();
			});

		// Coerce string value into JS value
		obj[prop] = convert(process.env[key]);
		return obj;
	}, {});

function convert(val: string | undefined): undefined | boolean | null | number {
	if (typeof val === 'undefined') return val;

	if (/^(yes|on|true|enabled)$/i.test(val)) {
		return true;
	} else if (/^(no|off|false|disabled)$/i.test(val)) {
		return false;
	} else if (val === 'null') {
		return null;
	} else {
		return Number(val);
	}
}

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */
export function useColors(): boolean {
	return 'colors' in inspectOpts ? Boolean(inspectOpts.colors) : tty.isatty(process.stderr.fd);
}

/**
 * Adds ANSI color escape codes if enabled.
 */
export function formatArgs(this: NodeDebugEnv, args: unknown[]): void {
	const { namespace: name, useColors } = this;

	if (useColors) {
		const c = this.color as number;
		const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c);
		const prefix = `  ${colorCode};1m${name} \u001B[0m`;

		args[0] = prefix + (args[0] as string).split('\n').join('\n' + prefix);
		args.push(colorCode + 'm+' + this.humanize(this.diff as number) + '\u001B[0m');
	} else {
		args[0] = getDate() + name + ' ' + args[0];
	}
}

function getDate() {
	if ((inspectOpts as Record<string, unknown>).hideDate) {
		return '';
	}
	return new Date().toISOString() + ' ';
}

/**
 * Invokes `util.format()` with the specified arguments and writes to stderr.
 */
export function log(...args: unknown[]): void {
	process.stderr.write(util.format(...args) + '\n');
}

/**
 * Save `namespaces`.
 */
export function save(namespaces: string): void {
	if (namespaces) {
		process.env.DEBUG = namespaces;
	} else {
		// If you set a process.env field to null or undefined, it gets cast to the
		// string 'null' or 'undefined'. Just delete instead.
		delete process.env.DEBUG;
	}
}

/**
 * Load `namespaces`.
 * Returns the previously persisted debug modes
 */
export function load(): string {
	return process.env.DEBUG as string;
}

const formatters: Record<string, Formatter<NodeDebugEnv>> = {
	o(this: NodeDebugEnv, v: unknown) {
		inspectOpts.colors = this.useColors;
		return util
			.inspect(v, this.inspectOpts)
			.split('\n')
			.map((str) => str.trim())
			.join(' ');
	},
	O(this: NodeDebugEnv, v: unknown) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts);
	},
};

export function init(this: NodeDebugEnv): void {
	this.inspectOpts = { ...inspectOpts };
	Object.assign(this.formatters, formatters);
}
