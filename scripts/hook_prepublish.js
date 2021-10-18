import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const source = new URL('..', import.meta.url);
const dist = new URL('dist/', source);

const files = {
	'README.md': true,
	'package.json': (package_file) => {
		const pkg = fs.readJsonSync(package_file);

		delete pkg.devDependencies;
		delete pkg.scripts;

		fs.writeJsonSync(package_file, pkg, { spaces: '\t' });
	},
};

Object.entries(files).forEach(([file, processor]) => {
	const from = fileURLToPath(new URL(file, source));
	const to = fileURLToPath(new URL(file, dist));

	fs.copySync(from, to);

	if (typeof processor === 'function') {
		processor(to);
	}
});
