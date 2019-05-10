import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Users } from '../../app/models';
import { hasPermission } from '../../app/authorization';
import { deleteUser } from '../../app/lib';

Meteor.methods({
	deleteUser(userId) {
		check(userId, String);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'deleteUser',
			});
		}

		if (hasPermission(Meteor.userId(), 'delete-user') !== true) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'deleteUser',
			});
		}

		const user = Users.findOneById(userId);
		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user to delete', {
				method: 'deleteUser',
			});
		}

		const adminCount = Meteor.users.find({ roles: 'admin' }).count();

		const userIsAdmin = user.roles.indexOf('admin') > -1;

		if (adminCount === 1 && userIsAdmin) {
			throw new Meteor.Error('error-action-not-allowed', 'Leaving the app without admins is not allowed', {
				method: 'deleteUser',
				action: 'Remove_last_admin',
			});
		}

		deleteUser(userId);

		return true;
	},
});
