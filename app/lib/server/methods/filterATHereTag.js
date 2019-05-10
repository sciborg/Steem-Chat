import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/tap:i18n';
import { hasPermission } from '../../../authorization';
import { callbacks } from '../../../callbacks';
import { Notifications } from '../../../notifications';
import { Users } from '../../../models';
import _ from 'underscore';
import moment from 'moment';

callbacks.add('beforeSaveMessage', function(message) {
	// If the message was edited, or is older than 60 seconds (imported)
	// the notifications will be skipped, so we can also skip this validation
	if (message.editedAt || (message.ts && Math.abs(moment(message.ts).diff()) > 60000)) {
		return message;
	}

	// Test if the message mentions include @here.
	if (message.mentions != null && _.pluck(message.mentions, '_id').some((item) => item === 'here')) {

		// Check if the user has permissions to use @here in both global and room scopes.
		if (!hasPermission(message.u._id, 'mention-here') && !hasPermission(message.u._id, 'mention-here', message.rid)) {

			// Get the language of the user for the error notification.
			const { language } = Users.findOneById(message.u._id);
			const action = TAPi18n.__('Notify_active_in_this_room', {}, language);

			// Add a notification to the chat, informing the user that this
			// action is not allowed.
			Notifications.notifyUser(message.u._id, 'message', {
				_id: Random.id(),
				rid: message.rid,
				ts: new Date,
				msg: TAPi18n.__('error-action-not-allowed', { action }, language),
			});

			// Also throw to stop propagation of 'sendMessage'.
			throw new Meteor.Error('error-action-not-allowed', 'Notify here in this room not allowed', {
				method: 'filterATHereTag',
				action: 'Notify_active_in_this_room',
			});
		}
	}

	return message;

}, 1, 'filterATHereTag');
