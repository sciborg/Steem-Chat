import { Meteor } from 'meteor/meteor';
import { LivechatVisitors } from '../../../app/models';
import { Migrations } from '../../../app/migrations';

Migrations.add({
	version: 106,
	up() {
		const visitors = Meteor.users.find({ type: 'visitor' });
		const total = visitors.count();
		let current = 1;

		console.log('Migrating livechat visitors, this may take a while ...');

		Meteor.setTimeout(() => {
			visitors.forEach((user) => {
				console.log(`Migrating visitor ${ current++ }/${ total }`);

				const {
					_id,
					name,
					username,
					deparment,
					userAgent,
					ip,
					host,
					visitorEmails,
					phone,
				} = user;
				LivechatVisitors.insert({
					_id,
					name,
					username,
					deparment,
					userAgent,
					ip,
					host,
					visitorEmails,
					phone,
					token: user.profile.token,
				});

				Meteor.users.remove({ _id });
			});

			console.log('Livechat visitors migration finished.');
		}, 1000);
	},
});
