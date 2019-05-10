import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { settings } from '../../../../settings';
import { hasRole } from '../../../../authorization';
import { Users } from '../../../../models';
import { LivechatDepartment } from '../../collections/LivechatDepartment';
import { LivechatQueueUser } from '../../collections/LivechatQueueUser';
import { AgentUsers } from '../../collections/AgentUsers';
import './livechatQueue.html';

Template.livechatQueue.helpers({
	departments() {
		return LivechatDepartment.find({
			enabled: true,
		}, {
			sort: {
				name: 1,
			},
		});
	},

	users() {
		const users = [];

		const showOffline = Template.instance().showOffline.get();

		LivechatQueueUser.find({
			departmentId: this._id,
		}, {
			sort: {
				count: 1,
				order: 1,
				username: 1,
			},
		}).forEach((user) => {
			const options = { fields: { _id: 1 } };
			const userFilter = { _id: user.agentId, status: { $ne: 'offline' } };
			const agentFilter = { _id: user.agentId, statusLivechat: 'available' };

			if (showOffline[this._id] || (Meteor.users.findOne(userFilter, options) && AgentUsers.findOne(agentFilter, options))) {
				users.push(user);
			}
		});

		return users;
	},

	hasPermission() {
		const user = Users.findOne(Meteor.userId(), { fields: { statusLivechat: 1 } });
		return hasRole(Meteor.userId(), 'livechat-manager') || (user.statusLivechat === 'available' && settings.get('Livechat_show_queue_list_link'));
	},
});

Template.livechatQueue.events({
	'click .show-offline'(event, instance) {
		const showOffline = instance.showOffline.get();

		showOffline[this._id] = event.currentTarget.checked;

		instance.showOffline.set(showOffline);
	},
});

Template.livechatQueue.onCreated(function() {
	this.showOffline = new ReactiveVar({});

	this.subscribe('livechat:queue');
	this.subscribe('livechat:agents');
	this.subscribe('livechat:departments');
});
