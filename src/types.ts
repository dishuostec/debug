export type Logger = (...args: unknown[]) => void;

export type Formatter<T extends DebugEnv> = (this: T, v: unknown) => string;

export interface DebugRuntime {
	colors: unknown[];

	formatters?: Record<string, Formatter<DebugEnv>>;

	useColors(): boolean;

	log(...args: unknown[]): void;

	save(namespaces: string): void;

	load(): string;

	init?(this: DebugEnv): void;

	formatArgs(this: DebugEnv, args: unknown[]): void;
}

export interface DebugEnv {
	enabled: boolean;

	log: Logger;

	extend(namespace: string, delimiter?: string): DebugInstance;
}

export interface DebugInstance extends DebugEnv, Logger {}

export interface Debug {
	log: Logger;

	(namespace: string): DebugInstance;

	enabled(namespace: string): boolean;

	enable(namespace: string): void;

	disable(): string;
}
