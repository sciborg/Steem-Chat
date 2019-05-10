import { Meteor } from 'meteor/meteor';
import { Messages, Rooms, Subscriptions, EmojiCustom } from '../../../models';
import { callbacks } from '../../../callbacks';
import { emoji } from '../../../emoji';
import _ from 'underscore';

Meteor.methods({
	setReaction(reaction, messageId) {
		if (!Meteor.userId()) {
			throw new Meteor.Error(203, 'User_logged_out');
		}

		const user = Meteor.user();

		const message = Messages.findOne({ _id: messageId });
		const room = Rooms.findOne({ _id: message.rid });

		if (Array.isArray(room.muted) && room.muted.indexOf(user.username) !== -1 && !room.reactWhenReadOnly) {
			return false;
		} else if (!Subscriptions.findOne({ rid: message.rid })) {
			return false;
		} else if (message.private) {
			return false;
		} else if (!emoji.list[reaction] && EmojiCustom.findByNameOrAlias(reaction).count() === 0) {
			return false;
		}

		if (message.reactions && message.reactions[reaction] && message.reactions[reaction].usernames.indexOf(user.username) !== -1) {
			message.reactions[reaction].usernames.splice(message.reactions[reaction].usernames.indexOf(user.username), 1);

			if (message.reactions[reaction].usernames.length === 0) {
				delete message.reactions[reaction];
			}

			if (_.isEmpty(message.reactions)) {
				delete message.reactions;
				Messages.unsetReactions(messageId);
				callbacks.run('unsetReaction', messageId, reaction);
			} else {
				Messages.setReactions(messageId, message.reactions);
				callbacks.run('setReaction', messageId, reaction);
			}
		} else {
			if (!message.reactions) {
				message.reactions = {};
			}
			if (!message.reactions[reaction]) {
				message.reactions[reaction] = {
					usernames: [],
				};
			}
			message.reactions[reaction].usernames.push(user.username);

			Messages.setReactions(messageId, message.reactions);
			callbacks.run('setReaction', messageId, reaction);
		}

		return;
	},
});
