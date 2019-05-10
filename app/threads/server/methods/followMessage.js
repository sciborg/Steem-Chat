import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Messages } from '../../../models/server';
import { RateLimiter } from '../../../lib/server';
import { settings } from '../../../settings/server';

import { follow } from '../functions';

Meteor.methods({
	'followMessage'({ mid }) {
		check(mid, String);

		const uid = Meteor.userId();
		if (!uid) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'followMessage' });
		}

		if (mid && !settings.get('Threads_enabled')) {
			throw new Meteor.Error('error-not-allowed', 'not-allowed', { method: 'followMessage' });
		}

		const message = Messages.findOneById(mid, { fields: { rid: 1, tmid: 1 } });
		if (!message) {
			throw new Meteor.Error('error-invalid-message', 'Invalid message', { method: 'followMessage' });
		}

		const room = Meteor.call('canAccessRoom', message.rid, uid);
		if (!room) {
			throw new Meteor.Error('error-not-allowed', 'not-allowed', { method: 'followMessage' });
		}

		return follow({ tmid: message.tmid || message._id, uid });
	},
});

RateLimiter.limitMethod('followMessage', 5, 5000, {
	userId() { return true; },
});
