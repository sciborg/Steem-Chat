import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from '../../../authorization';
import { Rooms } from '../../../models';

Meteor.methods({
	getRoomJoinCode(rid) {
		check(rid, String);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getJoinCode' });
		}

		if (!hasPermission(Meteor.userId(), 'view-join-code')) {
			throw new Meteor.Error('error-not-authorized', 'Not authorized', { method: 'getJoinCode' });
		}

		const [room] = Rooms.findById(rid).fetch();

		return room && room.joinCode;
	},
});
