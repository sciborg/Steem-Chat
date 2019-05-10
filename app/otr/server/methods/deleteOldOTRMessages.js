import { Meteor } from 'meteor/meteor';
import { Subscriptions, Messages } from '../../../models';

Meteor.methods({
	deleteOldOTRMessages(roomId) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'deleteOldOTRMessages' });
		}

		const now = new Date();
		const subscription = Subscriptions.findOneByRoomIdAndUserId(roomId, Meteor.userId());
		if (subscription && subscription.t === 'd') {
			Messages.deleteOldOTRMessages(roomId, now);
		} else {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'deleteOldOTRMessages' });
		}
	},
});
