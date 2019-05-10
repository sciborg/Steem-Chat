import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/tap:i18n';

import moment from 'moment';

import { hasPermission } from '../../../authorization';
import { metrics } from '../../../metrics';
import { settings } from '../../../settings';
import { Notifications } from '../../../notifications';
import { messageProperties } from '../../../ui-utils';
import { Users, Messages } from '../../../models';
import { sendMessage } from '../functions';
import { RateLimiter } from '../lib';
import { canSendMessage } from '../../../authorization/server';
import { SystemLogger } from '../../../logger/server';

Meteor.methods({
	sendMessage(message) {
		check(message, Object);

		const uid = Meteor.userId();
		if (!uid) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'sendMessage',
			});
		}

		if (message.tmid && !settings.get('Threads_enabled')) {
			throw new Meteor.Error('error-not-allowed', 'not-allowed', {
				method: 'sendMessage',
			});
		}

		if (message.ts) {
			const tsDiff = Math.abs(moment(message.ts).diff());
			if (tsDiff > 60000) {
				throw new Meteor.Error('error-message-ts-out-of-sync', 'Message timestamp is out of sync', {
					method: 'sendMessage',
					message_ts: message.ts,
					server_ts: new Date().getTime(),
				});
			} else if (tsDiff > 10000) {
				message.ts = new Date();
			}
		} else {
			message.ts = new Date();
		}

		if (message.msg) {
			const adjustedMessage = messageProperties.messageWithoutEmojiShortnames(message.msg);

			if (messageProperties.length(adjustedMessage) > settings.get('Message_MaxAllowedSize')) {
				throw new Meteor.Error('error-message-size-exceeded', 'Message size exceeds Message_MaxAllowedSize', {
					method: 'sendMessage',
				});
			}
		}

		const user = Users.findOneById(uid, {
			fields: {
				username: 1,
				...(!!settings.get('Message_SetNameToAliasEnabled') && { name: 1 }),
			},
		});
		let { rid } = message;

		// do not allow nested threads
		if (message.tmid) {
			const parentMessage = Messages.findOneById(message.tmid);
			message.tmid = parentMessage.tmid || message.tmid;
			rid = parentMessage.rid;
		}

		if (!rid) {
			throw new Error('The \'rid\' property on the message object is missing.');
		}

		try {
			const room = canSendMessage(rid, { uid, username: user.username });
			if (message.alias == null && settings.get('Message_SetNameToAliasEnabled')) {
				message.alias = user.name;
			}

			metrics.messagesSent.inc(); // TODO This line needs to be moved to it's proper place. See the comments on: https://github.com/RocketChat/Rocket.Chat/pull/5736
			return sendMessage(user, message, room);

		} catch (error) {
			if (error === 'error-not-allowed') {
				throw new Meteor.Error('error-not-allowed');
			}

			SystemLogger.error('Error sending message:', error);

			Notifications.notifyUser(uid, 'message', {
				_id: Random.id(),
				rid: message.rid,
				ts: new Date,
				msg: TAPi18n.__(error, {}, user.language),
			});
		}
	},
});
// Limit a user, who does not have the "bot" role, to sending 5 msgs/second
RateLimiter.limitMethod('sendMessage', 5, 1000, {
	userId(userId) {
		return !hasPermission(userId, 'send-many-messages');
	},
});
