import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { settings } from '../../../../settings';
import { KonchatNotification } from '../../lib/notification';

Template.secretURL.helpers({
	registrationAllowed() {
		const { hashIsValid } = Template.instance();
		return settings.get('Accounts_RegistrationForm') === 'Secret URL' && hashIsValid && hashIsValid.get();
	},
	ready() {
		const instance = Template.instance();
		return typeof instance.subscriptionsReady === 'function' && instance.subscriptionsReady() && instance.hashReady && instance.hashReady.get();
	},
});

Template.secretURL.onCreated(function() {
	this.hashIsValid = new ReactiveVar(false);
	this.hashReady = new ReactiveVar(false);
	Meteor.call('checkRegistrationSecretURL', FlowRouter.getParam('hash'), (err, success) => {
		this.hashReady.set(true);
		if (success) {
			Session.set('loginDefaultState', 'register');
			KonchatNotification.getDesktopPermission();
			return this.hashIsValid.set(true);
		}
		return this.hashIsValid.set(false);
	});
});

Template.secretURL.onRendered(function() {
	return $('#initial-page-loading').remove();
});
