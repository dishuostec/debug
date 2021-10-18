declare module 'ms' {
	function ms(val: number | string, options?: { long: boolean }): string;

	export = ms;
}
