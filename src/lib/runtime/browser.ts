/// <reference lib="DOM" />
import type { Formatter } from '../../types';
import type { Debug } from '../debug';
export const colors = [
	'#0000cc',
	'#0000ff',
	'#0033cc',
	'#0033ff',
	'#0066cc',
	'#0066ff',
	'#0099cc',
	'#0099ff',
	'#00cc00',
	'#00cc33',
	'#00cc66',
	'#00cc99',
	'#00cccc',
	'#00ccff',
	'#3300cc',
	'#3300ff',
	'#3333cc',
	'#3333ff',
	'#3366cc',
	'#3366ff',
	'#3399cc',
	'#3399ff',
	'#33cc00',
	'#33cc33',
	'#33cc66',
	'#33cc99',
	'#33cccc',
	'#33ccff',
	'#6600cc',
	'#6600ff',
	'#6633cc',
	'#6633ff',
	'#66cc00',
	'#66cc33',
	'#9900cc',
	'#9900ff',
	'#9933cc',
	'#9933ff',
	'#99cc00',
	'#99cc33',
	'#cc0000',
	'#cc0033',
	'#cc0066',
	'#cc0099',
	'#cc00cc',
	'#cc00ff',
	'#cc3300',
	'#cc3333',
	'#cc3366',
	'#cc3399',
	'#cc33cc',
	'#cc33ff',
	'#cc6600',
	'#cc6633',
	'#cc9900',
	'#cc9933',
	'#cccc00',
	'#cccc33',
	'#ff0000',
	'#ff0033',
	'#ff0066',
	'#ff0099',
	'#ff00cc',
	'#ff00ff',
	'#ff3300',
	'#ff3333',
	'#ff3366',
	'#ff3399',
	'#ff33cc',
	'#ff33ff',
	'#ff6600',
	'#ff6633',
	'#ff9900',
	'#ff9933',
	'#ffcc00',
	'#ffcc33',
];

type BrowserDebugEnv = Debug;

declare global {
	interface Window {
		process: Record<string, unknown>;
	}

	interface CSSStyleDeclaration {
		WebkitAppearance?: unknown;
	}

	interface Console {
		firebug?: unknown;
		exception?: unknown;
	}
}

export function useColors(): boolean {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (window?.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (
		typeof navigator !== 'undefined' &&
		navigator.userAgent &&
		navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)
	) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (document?.documentElement?.style?.WebkitAppearance ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		window?.console?.firebug ||
		(window?.console?.exception && window?.console?.table) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(navigator?.userAgent?.toLowerCase().match(/firefox\/(\d+)/) &&
			parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		navigator?.userAgent?.toLowerCase().match(/applewebkit\/(\d+)/)) as boolean;
}

/**
 * Colorize log arguments if enabled.
 */
export function formatArgs(this: BrowserDebugEnv, args: unknown[]): void {
	const color = this.useColors ? '%c' : '';
	args[0] = `${color}${this.namespace} ${color}${args[0]}${color} +${this.humanize(
		this.diff as number,
	)}`;

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	for (const match of (args[0] as string).match(/%[a-zA-Z%]/g) || []) {
		if (match === '%%') {
			continue;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	}

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const log = console.debug ?? console.log ?? (() => {});

let storage: Storage;
try {
	storage = localStorage;
} catch (e) {
	// Swallow
}

/**
 * Save `namespaces`.
 */
export function save(namespaces: string): void {
	try {
		if (namespaces) {
			storage.setItem('debug', namespaces);
		} else {
			storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
export function load(): string {
	let r;
	try {
		r = storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r as string;
}

const formatters: Record<string, Formatter<BrowserDebugEnv>> = {
	j(this: BrowserDebugEnv, v: unknown) {
		try {
			return JSON.stringify(v);
		} catch (error: unknown) {
			return '[UnexpectedJSONParseError]: ' + (error as Record<string, undefined>).message;
		}
	},
};

export function init(this: BrowserDebugEnv): void {
	Object.assign(this.formatters, formatters);
}
