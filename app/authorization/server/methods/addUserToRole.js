import { Meteor } from 'meteor/meteor';
import { Users, Roles } from '../../../models';
import { settings } from '../../../settings';
import { Notifications } from '../../../notifications';
import { hasPermission } from '../functions/hasPermission';
import _ from 'underscore';

Meteor.methods({
	'authorization:addUserToRole'(roleName, username, scope) {
		if (!Meteor.userId() || !hasPermission(Meteor.userId(), 'access-permissions')) {
			throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
				method: 'authorization:addUserToRole',
				action: 'Accessing_permissions',
			});
		}

		if (!roleName || !_.isString(roleName) || !username || !_.isString(username)) {
			throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
				method: 'authorization:addUserToRole',
			});
		}

		if (roleName === 'admin' && !hasPermission(Meteor.userId(), 'assign-admin-role')) {
			throw new Meteor.Error('error-action-not-allowed', 'Assigning admin is not allowed', {
				method: 'authorization:addUserToRole',
				action: 'Assign_admin',
			});
		}

		const user = Users.findOneByUsername(username, {
			fields: {
				_id: 1,
			},
		});

		if (!user || !user._id) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'authorization:addUserToRole',
			});
		}

		const add = Roles.addUserRoles(user._id, roleName, scope);

		if (settings.get('UI_DisplayRoles')) {
			Notifications.notifyLogged('roles-change', {
				type: 'added',
				_id: roleName,
				u: {
					_id: user._id,
					username,
				},
				scope,
			});
		}

		return add;
	},
});
