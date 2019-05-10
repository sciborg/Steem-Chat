import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { UserRoles, RoomRoles, ChatMessage } from '../../../models';
import { handleError } from '../../../utils';
import { Notifications } from '../../../notifications';

Meteor.startup(function() {
	Tracker.autorun(function() {
		if (Meteor.userId()) {
			Meteor.call('getUserRoles', (error, results) => {
				if (error) {
					return handleError(error);
				}

				for (const record of results) {
					UserRoles.upsert({ _id: record._id }, record);
				}
			});

			Notifications.onLogged('roles-change', function(role) {
				if (role.type === 'added') {
					if (role.scope) {
						RoomRoles.upsert({ rid: role.scope, 'u._id': role.u._id }, { $setOnInsert: { u: role.u }, $addToSet: { roles: role._id } });
					} else {
						UserRoles.upsert({ _id: role.u._id }, { $addToSet: { roles: role._id }, $set: { username: role.u.username } });
						ChatMessage.update({ 'u._id': role.u._id }, { $addToSet: { roles: role._id } }, { multi: true });
					}
				} else if (role.type === 'removed') {
					if (role.scope) {
						RoomRoles.update({ rid: role.scope, 'u._id': role.u._id }, { $pull: { roles: role._id } });
					} else {
						UserRoles.update({ _id: role.u._id }, { $pull: { roles: role._id } });
						ChatMessage.update({ 'u._id': role.u._id }, { $pull: { roles: role._id } }, { multi: true });
					}
				} else if (role.type === 'changed') {
					ChatMessage.update({ roles: role._id }, { $inc: { rerender: 1 } }, { multi: true });
				}
			});
		}
	});
});
