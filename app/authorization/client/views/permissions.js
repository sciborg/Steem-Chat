import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { Roles } from '../../../models';
import { ChatPermissions } from '../lib/ChatPermissions';
import { hasAllPermission } from '../hasPermission';
import { SideNav } from '../../../ui-utils/client/lib/SideNav';

Template.permissions.helpers({
	role() {
		return Template.instance().roles.get();
	},

	permission() {
		return ChatPermissions.find({}, {
			sort: {
				_id: 1,
			},
		});
	},

	granted(roles) {
		if (roles) {
			if (roles.indexOf(this._id) !== -1) {
				return 'checked';
			}
		}
	},

	permissionName() {
		return `${ this._id }`;
	},

	permissionDescription() {
		return `${ this._id }_description`;
	},

	hasPermission() {
		return hasAllPermission('access-permissions');
	},
});

Template.permissions.events({
	'click .role-permission'(e, instance) {
		const permission = e.currentTarget.getAttribute('data-permission');
		const role = e.currentTarget.getAttribute('data-role');

		if (instance.permissionByRole[permission].indexOf(role) === -1) {
			return Meteor.call('authorization:addPermissionToRole', permission, role);
		} else {
			return Meteor.call('authorization:removeRoleFromPermission', permission, role);
		}
	},
});

Template.permissions.onCreated(function() {
	this.roles = new ReactiveVar([]);
	this.permissionByRole = {};
	this.actions = {
		added: {},
		removed: {},
	};

	Tracker.autorun(() => {
		this.roles.set(Roles.find().fetch());
	});

	Tracker.autorun(() => {
		ChatPermissions.find().observeChanges({
			added: (id, fields) => {
				this.permissionByRole[id] = fields.roles;
			},
			changed: (id, fields) => {
				this.permissionByRole[id] = fields.roles;
			},
			removed: (id) => {
				delete this.permissionByRole[id];
			},
		});
	});
});

Template.permissions.onRendered(() => {
	Tracker.afterFlush(() => {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});
