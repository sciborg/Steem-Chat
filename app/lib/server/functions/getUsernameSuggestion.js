import limax from 'limax';
import { Users } from '../../../models';
import { settings } from '../../../settings';

function slug(text) {
	return limax(text, { replacement: '.' }).replace(/[^0-9a-z-_.]/g, '');
}

function usernameIsAvaliable(username) {
	if (username.length === 0) {
		return false;
	}

	if (username === 'all') {
		return false;
	}

	return !Users.findOneByUsername(username);
}


const name = (username) => (settings.get('UTF8_Names_Slugify') ? slug(username) : username);

export function generateUsernameSuggestion(user) {
	let usernames = [];

	if (user.name) {

		usernames.push(name(user.name));

		const nameParts = user.name.split(' ');

		if (nameParts.length > 1) {
			const [first] = nameParts;
			const last = nameParts[nameParts.length - 1];
			usernames.push(name(first[0] + last));
			usernames.push(name(first + last[0]));
		}
	}

	if (user.profile && user.profile.name) {
		usernames.push(name(user.profile.name));
	}

	if (Array.isArray(user.services)) {
		const services = new Set(user.services.flatMap(({ name, username, firstName, lastName }) => [name, username, firstName, lastName]));
		usernames.push(...services.map(name));
	}

	if (user.emails && user.emails.length > 0) {
		for (const email of user.emails) {
			if (email.address && email.verified === true) {
				usernames.push(slug(email.address.replace(/@.+$/, '')));
				usernames.push(slug(email.address.replace(/(.+)@(\w+).+/, '$1.$2')));
			}
		}
	}

	usernames = usernames.filter((e) => e);

	for (const item of usernames) {
		if (usernameIsAvaliable(item)) {
			return item;
		}
	}

	usernames.push(settings.get('Accounts_DefaultUsernamePrefixSuggestion'));

	let index = Users.find({ username: new RegExp(`^${ usernames[0] }-[0-9]+`) }).count();
	const username = '';
	while (!username) {
		if (usernameIsAvaliable(`${ usernames[0] }-${ index }`)) {
			return `${ usernames[0] }-${ index }`;
		}
		index++;
	}
}
