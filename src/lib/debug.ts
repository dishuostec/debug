import ms from 'ms';
import type { DebugEnv, DebugInstance, DebugRuntime, Formatter, Logger } from '../types';
import { enabled } from './common';

function coerce<T extends unknown>(val: T): string | T {
	if (val instanceof Error) {
		return val.stack || val.message;
	}
	return val;
}

let log: Logger;

export function set_logger(fn: Logger): void {
	log = fn;
}

export class Debug implements DebugEnv {
	static mixin(instance: Debug): DebugInstance {
		const { debug } = instance;

		Object.defineProperties(debug, {
			enabled: {
				get: () => instance.enabled,
				set: (v: boolean) => instance.enabled = v,
			},
			log: {
				set: (fn: Logger) => instance.log = fn,
			},
			extend: {
				value: instance.extend,
			},
		});

		return debug as DebugInstance;
	}

	static #selectColor(namespace: string, colors: unknown[]): unknown {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = (hash << 5) - hash + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return colors[Math.abs(hash) % colors.length];
	}

	diff: number | undefined;
	formatters: Record<string, Formatter<this>> = {};
	readonly color: unknown;
	readonly useColors: boolean;
	readonly namespace: string;
	humanize: (v: number | string) => string = ms;
	#runtime: DebugRuntime;
	#enableOverride: boolean | null = null;
	#log: Logger | null = null;
	private prevTime: number | undefined;

	constructor({ namespace, runtime }: { namespace: string; runtime: DebugRuntime }) {
		this.namespace = namespace;
		this.#runtime = runtime;
		this.useColors = !!runtime.useColors();
		this.color = Debug.#selectColor(namespace, runtime.colors);

		runtime.init?.call(this);
	}

	get enabled(): boolean {
		if (this.#enableOverride !== null) {
			return this.#enableOverride;
		}
		return enabled(this.namespace);
	}

	set enabled(v: boolean) {
		this.#enableOverride = v;
	}

	set log(fn: Logger) {
		this.#log = fn;
	}

	debug = (...args: unknown[]): void => {
		// Disabled?
		if (!this.enabled) {
			return;
		}

		// Set `diff` timestamp
		const curr = Number(new Date());
		this.diff = curr - (this.prevTime || curr);
		this.prevTime = curr;

		args[0] = coerce(args[0]);

		if (typeof args[0] !== 'string') {
			// Anything else let's inspect with %O
			args.unshift('%O');
		}

		// Apply any `formatters` transformations
		let index = 0;
		args[0] = (args[0] as string).replace(/%([a-zA-Z%])/g, (match: string, format: number) => {
			// If we encounter an escaped % then don't increase the array index
			if (match === '%%') {
				return '%';
			}
			index++;
			const formatter = this.formatters[format];
			if (typeof formatter === 'function') {
				const val = args[index];
				match = formatter.call(this, val);

				// Now we need to remove `args[index]` since it's inlined in the `format`
				args.splice(index, 1);
				index--;
			}
			return match;
		});

		// Apply env-specific formatting (colors, etc.)
		this.#runtime.formatArgs.call(this, args);

		const logFn = log ?? this.#log ?? this.#runtime.log;
		logFn.apply(this, args);
	};

	extend = (namespace: string, delimiter = ':'): DebugInstance => {
		const instance = new Debug({
			namespace: this.namespace + delimiter + namespace,
			runtime: this.#runtime,
		});
		return Debug.mixin(instance);
	};
}
