/* eslint object-shorthand: 0, prefer-template: 0 */

const path = require('path');
const fs = require('fs');
const semver = require('semver');
const inquirer = require('inquirer');
// const execSync = require('child_process').execSync;
const git = require('simple-git/promise')(process.cwd());

let pkgJson = {};

try {
	pkgJson = require(path.resolve(
		process.cwd(),
		'./package.json'
	));
} catch (err) {
	console.error('no root package.json found');
}

const files = [
	'./package.json',
	'./.travis/snap.sh',
	'./.circleci/snap.sh',
	'./.circleci/update-releases.sh',
	'./.docker/Dockerfile',
	'./.docker/Dockerfile.rhel',
	'./packages/rocketchat-utils/rocketchat.info',
];
const readFile = (file) => new Promise((resolve, reject) => {
	fs.readFile(file, 'utf8', (error, result) => {
		if (error) {
			return reject(error);
		}
		resolve(result);
	});
});
const writeFile = (file, data) => new Promise((resolve, reject) => {
	fs.writeFile(file, data, 'utf8', (error, result) => {
		if (error) {
			return reject(error);
		}
		resolve(result);
	});
});

let selectedVersion;

git.status()
	.then((status) => {
		if (status.current === 'release-candidate') {
			return semver.inc(pkgJson.version, 'prerelease', 'rc');
		}
		if (/release-\d+\.\d+\.\d+/.test(status.current)) {
			return semver.inc(pkgJson.version, 'patch');
		}
		if (status.current === 'develop-sync') {
			return semver.inc(pkgJson.version, 'minor') + '-develop';
		}
		return Promise.reject(`No release action for branch ${ status.current }`);
	})
	.then((nextVersion) => inquirer.prompt([{
		type: 'list',
		message: `The current version is ${ pkgJson.version }. Update to version:`,
		name: 'version',
		choices: [
			nextVersion,
			'custom',
		],
	}]))
	.then((answers) => {
		if (answers.version === 'custom') {
			return inquirer.prompt([{
				name: 'version',
				message: 'Enter your custom version:',
			}]);
		}
		return answers;
	})
	.then(({ version }) => {
		selectedVersion = version;
		return Promise.all(files.map((file) => readFile(file)
			.then((data) => writeFile(file, data.replace(pkgJson.version, version)))));
	})
	.then(() =>
		inquirer.prompt([{
			type: 'confirm',
			message: 'Commit files?',
			name: 'commit',
		}])
	)
	.then((answers) => {
		if (!answers.commit) {
			return Promise.reject(answers);
		}

		return git.status();
	})
	.then((status) => inquirer.prompt([{
		type: 'checkbox',
		message: 'Select files to commit?',
		name: 'files',
		choices: status.files.map((file) => ({ name: `${ file.working_dir } ${ file.path }`, checked: true })),
	}]))
	.then((answers) => answers.files.length && git.add(answers.files.map((file) => file.slice(2))))
	.then(() => git.commit(`Bump version to ${ selectedVersion }`))
	.then(() => inquirer.prompt([{
		type: 'confirm',
		message: `Add tag ${ selectedVersion }?`,
		name: 'tag',
	}]))
	.then((answers) => answers.tag && git.addTag(selectedVersion))
	.catch((error) => {
		console.error(error);
	});
