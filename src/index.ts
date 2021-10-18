import { disable, enable, enabled, get_runtime, use } from './lib/common';
import { Debug, set_logger } from './lib/debug';
import type { DebugInstance, Logger } from './types';

declare const process: Record<string, undefined>;

/**
 * Detect Electron renderer / nwjs process, which is node, but we should
 * treat as a browser.
 */
const runtime =
	typeof process === 'undefined' ||
	!process.arch ||
	process.type === 'renderer' ||
	process.browser === true ||
	process.__nwjs
		? await import('./lib/runtime/browser')
		: await import('./lib/runtime/node');

use(runtime);

function create_debug(namespace: string): DebugInstance {
	const instance = new Debug({ namespace, runtime: get_runtime() });
	return Debug.mixin(instance);
}

const debug = Object.assign(create_debug, {
	set log(fn: Logger) {
		set_logger(fn);
	},
	enabled,
	enable,
	disable,
});

export default debug;

export { use, get_runtime as runtime };
