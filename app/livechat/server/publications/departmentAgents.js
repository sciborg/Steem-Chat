import { Meteor } from 'meteor/meteor';
import { hasPermission } from '../../../authorization';
import { LivechatDepartmentAgents } from '../../../models';

Meteor.publish('livechat:departmentAgents', function(departmentId) {
	if (!this.userId) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:departmentAgents' }));
	}

	if (!hasPermission(this.userId, 'view-livechat-rooms')) {
		return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', { publish: 'livechat:departmentAgents' }));
	}

	return LivechatDepartmentAgents.find({ departmentId });
});
