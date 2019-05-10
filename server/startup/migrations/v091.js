import { Migrations } from '../../../app/migrations';
import { Users } from '../../../app/models';

Migrations.add({
	version: 91,
	up() {
		const query = {
			'services.linkedin': {
				$exists: 1,
			},
			$or: [{
				name: {
					$exists: 0,
				},
			}, {
				name: null,
			}],
		};

		Users.find(query, { 'services.linkedin.firstName': 1, username: 1 }).forEach((user) => {
			const name = `${ user.services.linkedin.firstName } ${ user.services.linkedin.lastName }`;

			Users.setName(user._id, name);
		});
	},
});
