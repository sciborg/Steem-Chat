import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import { Rooms, Subscriptions, Users } from '../../../models';
import { hasPermission } from '../../../authorization';
import { addUserToRoom } from '../functions';

Meteor.methods({
	addUsersToRoom(data = {}) {
		// Validate user and room
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'addUsersToRoom',
			});
		}

		if (!Match.test(data.rid, String)) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', {
				method: 'addUsersToRoom',
			});
		}

		// Get user and room details
		const room = Rooms.findOneById(data.rid);
		const userId = Meteor.userId();
		const subscription = Subscriptions.findOneByRoomIdAndUserId(data.rid, userId, { fields: { _id: 1 } });
		const userInRoom = subscription != null;

		// Can't add to direct room ever
		if (room.t === 'd') {
			throw new Meteor.Error('error-cant-invite-for-direct-room', 'Can\'t invite user to direct rooms', {
				method: 'addUsersToRoom',
			});
		}

		// Can add to any room you're in, with permission, otherwise need specific room type permission
		let canAddUser = false;
		if (userInRoom && hasPermission(userId, 'add-user-to-joined-room', room._id)) {
			canAddUser = true;
		} else if (room.t === 'c' && hasPermission(userId, 'add-user-to-any-c-room')) {
			canAddUser = true;
		} else if (room.t === 'p' && hasPermission(userId, 'add-user-to-any-p-room')) {
			canAddUser = true;
		}

		// Adding wasn't allowed
		if (!canAddUser) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'addUsersToRoom',
			});
		}

		// Missing the users to be added
		if (!Array.isArray(data.users)) {
			throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
				method: 'addUsersToRoom',
			});
		}

		// Validate each user, then add to room
		const user = Meteor.user();
		data.users.forEach((username) => {
			const newUser = Users.findOneByUsername(username);
			if (!newUser) {
				throw new Meteor.Error('error-invalid-username', 'Invalid username', {
					method: 'addUsersToRoom',
				});
			}
			addUserToRoom(data.rid, newUser, user);
		});

		return true;
	},
});
