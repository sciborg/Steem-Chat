import { Meteor } from 'meteor/meteor';
import { hasPermission } from '../../../authorization';
import { Rooms, LivechatVisitors } from '../../../models';

Meteor.publish('livechat:visitorInfo', function({ rid: roomId }) {
	if (!this.userId) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:visitorInfo' }));
	}

	if (!hasPermission(this.userId, 'view-l-room')) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:visitorInfo' }));
	}

	const room = Rooms.findOneById(roomId);

	if (room && room.v && room.v._id) {
		return LivechatVisitors.findById(room.v._id);
	} else {
		return this.ready();
	}
});
