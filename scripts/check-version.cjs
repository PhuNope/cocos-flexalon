'use strict';
const pkg = require('../package.json');
const tag = process.argv[2] || process.env.RELEASE_TAG;
if (!tag || tag !== `v${pkg.version}`) {
    console.error(`[Flexalon] Release tag must be v${pkg.version}; got: ${tag || '(none)'}`);
    process.exit(1);
}
console.log(`[Flexalon] Release tag ${tag} matches package.json`);
