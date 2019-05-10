import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Messages } from '../../app/models';
import { settings } from '../../app/settings';

Meteor.methods({
	loadMissedMessages(rid, start) {
		check(rid, String);
		check(start, Date);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'loadMissedMessages',
			});
		}

		const fromId = Meteor.userId();
		if (!Meteor.call('canAccessRoom', rid, fromId)) {
			return false;
		}

		const options = {
			sort: {
				ts: -1,
			},
		};

		if (!settings.get('Message_ShowEditedStatus')) {
			options.fields = {
				editedAt: 0,
			};
		}

		return Messages.findVisibleByRoomIdAfterTimestamp(rid, start, options).fetch();
	},
});
