import type { DebugRuntime } from '../types';

let runtime: DebugRuntime;

export function get_runtime(): DebugRuntime {
	return runtime;
}

export function use(rt: DebugRuntime): void {
	runtime = rt;
	enable(rt.load());
}

let names: RegExp[] = [];
let skips: RegExp[] = [];
const enabledCache: Map<string, boolean> = new Map();

/**
 * Returns true if the given mode name is enabled, false otherwise.
 */
export function enabled(name: string): boolean {
	if (name.endsWith('*')) {
		return true;
	}
	if (enabledCache.has(name)) {
		return enabledCache.get(name) as boolean;
	}

	const is_enabled = !skips.some((reg) => reg.test(name)) && names.some((reg) => reg.test(name));
	enabledCache.set(name, is_enabled);

	return is_enabled;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 */
export function enable(namespaces: string): void {
	runtime.save(namespaces);

	skips = [];
	names = [];
	enabledCache.clear();

	`${namespaces}`
		.split(/[\s,]+/)
		.filter(Boolean)
		.map((part) => part.replace(/\*/g, '.*?'))
		.forEach((namespace) => {
			if (namespace[0] === '-') {
				skips.push(new RegExp('^' + namespace.substr(1) + '$'));
			} else {
				names.push(new RegExp('^' + namespace + '$'));
			}
		});
}

/**
 * Disable debug output.
 */
export function disable(): string {
	const namespaces = [
		...names.map(toNamespace),
		...skips.map(toNamespace).map((namespace) => '-' + namespace),
	].join(',');
	enable('');
	return namespaces;
}

function toNamespace(regexp: RegExp) {
	return regexp
		.toString()
		.substring(2, regexp.toString().length - 2)
		.replace(/\.\*\?$/, '*');
}
