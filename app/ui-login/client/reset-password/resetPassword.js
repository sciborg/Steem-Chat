import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { modal } from '../../../ui-utils';
import { t } from '../../../utils';
import { Button } from '../../../ui';
import { callbacks } from '../../../callbacks';
import toastr from 'toastr';

Template.resetPassword.helpers({
	requirePasswordChange() {
		const user = Meteor.user();
		if (user) {
			return user.requirePasswordChange;
		}
	},
	requirePasswordChangeReason() {
		const user = Meteor.user();
		if (user) {
			return user.requirePasswordChangeReason;
		}
	},
});

Template.resetPassword.events({
	'focus .input-text input'(event) {
		$(event.currentTarget).parents('.input-text').addClass('focus');
	},
	'blur .input-text input'(event) {
		if (event.currentTarget.value === '') {
			$(event.currentTarget).parents('.input-text').removeClass('focus');
		}
	},
	'submit #login-card'(event, instance) {
		event.preventDefault();

		const button = instance.$('button.resetpass');
		Button.loading(button);

		if (Meteor.userId() && !FlowRouter.getParam('token')) {
			Meteor.call('setUserPassword', instance.find('[name=newPassword]').value, function(error) {
				if (error) {
					console.log(error);
					modal.open({
						title: t('Error_changing_password'),
						type: 'error',
					});
				}
			});
		} else {
			Accounts.resetPassword(FlowRouter.getParam('token'), instance.find('[name=newPassword]').value, function(error) {
				Button.reset(button);
				if (error) {
					console.log(error);
					if (error.error === 'totp-required') {
						toastr.success(t('Password_changed_successfully'));
						callbacks.run('userPasswordReset');
						FlowRouter.go('login');
					} else {
						modal.open({
							title: t('Error_changing_password'),
							type: 'error',
						});
					}
				} else {
					FlowRouter.go('home');
					toastr.success(t('Password_changed_successfully'));
					callbacks.run('userPasswordReset');
				}
			});
		}
	},
});

Template.resetPassword.onRendered(function() {
	this.find('[name=newPassword]').focus();
});
