import { Meteor } from 'meteor/meteor';
import { hasPermission, getUsersInRole } from '../../../authorization';

Meteor.publish('livechat:managers', function() {
	if (!this.userId) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:managers' }));
	}

	if (!hasPermission(this.userId, 'view-livechat-rooms')) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:managers' }));
	}

	const self = this;

	const handle = getUsersInRole('livechat-manager').observeChanges({
		added(id, fields) {
			self.added('managerUsers', id, fields);
		},
		changed(id, fields) {
			self.changed('managerUsers', id, fields);
		},
		removed(id) {
			self.removed('managerUsers', id);
		},
	});

	self.ready();

	self.onStop(function() {
		handle.stop();
	});
});
