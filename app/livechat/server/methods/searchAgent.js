import { Meteor } from 'meteor/meteor';
import { hasPermission } from '../../../authorization';
import { Users } from '../../../models';
import _ from 'underscore';

Meteor.methods({
	'livechat:searchAgent'(username) {
		if (!Meteor.userId() || !hasPermission(Meteor.userId(), 'view-livechat-manager')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'livechat:searchAgent' });
		}

		if (!username || !_.isString(username)) {
			throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', { method: 'livechat:searchAgent' });
		}

		const user = Users.findOneByUsername(username, { fields: { _id: 1, username: 1 } });

		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'livechat:searchAgent' });
		}

		return user;
	},
});
