import { Meteor } from 'meteor/meteor';
import { Subscriptions } from '../../../models';
import { getRoomByNameOrIdWithOptionToJoin } from './getRoomByNameOrIdWithOptionToJoin';
import { sendMessage } from './sendMessage';
import _ from 'underscore';
import s from 'underscore.string';

export const processWebhookMessage = function(messageObj, user, defaultValues = { channel: '', alias: '', avatar: '', emoji: '' }, mustBeJoined = false) {
	const sentData = [];
	const channels = [].concat(messageObj.channel || messageObj.roomId || defaultValues.channel);

	for (const channel of channels) {
		const channelType = channel[0];

		let channelValue = channel.substr(1);
		let room;

		switch (channelType) {
			case '#':
				room = getRoomByNameOrIdWithOptionToJoin({ currentUserId: user._id, nameOrId: channelValue, joinChannel: true });
				break;
			case '@':
				room = getRoomByNameOrIdWithOptionToJoin({ currentUserId: user._id, nameOrId: channelValue, type: 'd' });
				break;
			default:
				channelValue = channelType + channelValue;

				// Try to find the room by id or name if they didn't include the prefix.
				room = getRoomByNameOrIdWithOptionToJoin({ currentUserId: user._id, nameOrId: channelValue, joinChannel: true, errorOnEmpty: false });
				if (room) {
					break;
				}

				// We didn't get a room, let's try finding direct messages
				room = getRoomByNameOrIdWithOptionToJoin({ currentUserId: user._id, nameOrId: channelValue, type: 'd', tryDirectByUserIdOnly: true });
				if (room) {
					break;
				}

				// No room, so throw an error
				throw new Meteor.Error('invalid-channel');
		}

		if (mustBeJoined && !Subscriptions.findOneByRoomIdAndUserId(room._id, user._id, { fields: { _id: 1 } })) {
			// throw new Meteor.Error('invalid-room', 'Invalid room provided to send a message to, must be joined.');
			throw new Meteor.Error('invalid-channel'); // Throwing the generic one so people can't "brute force" find rooms
		}

		if (messageObj.attachments && !_.isArray(messageObj.attachments)) {
			console.log('Attachments should be Array, ignoring value'.red, messageObj.attachments);
			messageObj.attachments = undefined;
		}

		const message = {
			alias: messageObj.username || messageObj.alias || defaultValues.alias,
			msg: s.trim(messageObj.text || messageObj.msg || ''),
			attachments: messageObj.attachments || [],
			parseUrls: messageObj.parseUrls !== undefined ? messageObj.parseUrls : !messageObj.attachments,
			bot: messageObj.bot,
			groupable: (messageObj.groupable !== undefined) ? messageObj.groupable : false,
		};

		if (!_.isEmpty(messageObj.icon_url) || !_.isEmpty(messageObj.avatar)) {
			message.avatar = messageObj.icon_url || messageObj.avatar;
		} else if (!_.isEmpty(messageObj.icon_emoji) || !_.isEmpty(messageObj.emoji)) {
			message.emoji = messageObj.icon_emoji || messageObj.emoji;
		} else if (!_.isEmpty(defaultValues.avatar)) {
			message.avatar = defaultValues.avatar;
		} else if (!_.isEmpty(defaultValues.emoji)) {
			message.emoji = defaultValues.emoji;
		}

		if (_.isArray(message.attachments)) {
			for (let i = 0; i < message.attachments.length; i++) {
				const attachment = message.attachments[i];
				if (attachment.msg) {
					attachment.text = s.trim(attachment.msg);
					delete attachment.msg;
				}
			}
		}

		const messageReturn = sendMessage(user, message, room);
		sentData.push({ channel, message: messageReturn });
	}

	return sentData;
};
