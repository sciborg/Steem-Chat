import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/tap:i18n';
import { Notifications } from '../../notifications';
import { slashCommands } from '../../utils';

/*
* Leave is a named function that will replace /leave commands
* @param {Object} message - The message object
*/
function Leave(command, params, item) {
	if (command !== 'leave' && command !== 'part') {
		return;
	}

	try {
		Meteor.call('leaveRoom', item.rid);
	} catch ({ error }) {
		Notifications.notifyUser(Meteor.userId(), 'message', {
			_id: Random.id(),
			rid: item.rid,
			ts: new Date,
			msg: TAPi18n.__(error, null, Meteor.user().language),
		});
	}
}

slashCommands.add('leave', Leave, { description: 'Leave_the_current_channel' });
slashCommands.add('part', Leave, { description: 'Leave_the_current_channel' });
