import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { modal } from '../../../../ui-utils';
import { t, handleError } from '../../../../utils';
import { LivechatDepartment } from '../../collections/LivechatDepartment';
import './livechatDepartments.html';

Template.livechatDepartments.helpers({
	departments() {
		return LivechatDepartment.find();
	},
});

Template.livechatDepartments.events({
	'click .remove-department'(e/* , instance*/) {
		e.preventDefault();
		e.stopPropagation();

		modal.open({
			title: t('Are_you_sure'),
			type: 'warning',
			showCancelButton: true,
			confirmButtonColor: '#DD6B55',
			confirmButtonText: t('Yes'),
			cancelButtonText: t('Cancel'),
			closeOnConfirm: false,
			html: false,
		}, () => {
			Meteor.call('livechat:removeDepartment', this._id, function(error/* , result*/) {
				if (error) {
					return handleError(error);
				}
				modal.open({
					title: t('Removed'),
					text: t('Department_removed'),
					type: 'success',
					timer: 1000,
					showConfirmButton: false,
				});
			});
		});
	},

	'click .department-info'(e/* , instance*/) {
		e.preventDefault();
		FlowRouter.go('livechat-department-edit', { _id: this._id });
	},
});

Template.livechatDepartments.onCreated(function() {
	this.subscribe('livechat:departments');
});
