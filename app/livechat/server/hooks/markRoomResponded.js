import { Meteor } from 'meteor/meteor';
import { callbacks } from '../../../callbacks';
import { Rooms } from '../../../models';

callbacks.add('afterSaveMessage', function(message, room) {
	// skips this callback if the message was edited
	if (!message || message.editedAt) {
		return message;
	}

	// check if room is yet awaiting for response
	if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.waitingResponse)) {
		return message;
	}

	// if the message has a token, it was sent by the visitor, so ignore it
	if (message.token) {
		return message;
	}

	Meteor.defer(() => {
		Rooms.setResponseByRoomId(room._id, {
			user: {
				_id: message.u._id,
				username: message.u.username,
			},
		});
	});

	return message;
}, callbacks.priority.LOW, 'markRoomResponded');
