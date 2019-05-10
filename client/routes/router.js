import s from 'underscore.string';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Tracker } from 'meteor/tracker';
import { Blaze } from 'meteor/blaze';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Session } from 'meteor/session';
import { KonchatNotification } from '../../app/ui';

Blaze.registerHelper('pathFor', function(path, kw) {
	return FlowRouter.path(path, kw.hash);
});

BlazeLayout.setRoot('body');

FlowRouter.subscriptions = function() {
	Tracker.autorun(() => {
		if (Meteor.userId()) {
			this.register('userData', Meteor.subscribe('userData'));
			this.register('activeUsers', Meteor.subscribe('activeUsers'));
		}
	});
};


FlowRouter.route('/', {
	name: 'index',
	action() {
		BlazeLayout.render('main', { center: 'loading' });
		if (!Meteor.userId()) {
			return FlowRouter.go('home');
		}

		Tracker.autorun(function(c) {
			if (FlowRouter.subsReady() === true) {
				Meteor.defer(function() {
					if (Meteor.user() && Meteor.user().defaultRoom) {
						const room = Meteor.user().defaultRoom.split('/');
						FlowRouter.go(room[0], { name: room[1] }, FlowRouter.current().queryParams);
					} else {
						FlowRouter.go('home');
					}
				});
				c.stop();
			}
		});
	},
});


FlowRouter.route('/login', {
	name: 'login',

	action() {
		FlowRouter.go('home');
	},
});

FlowRouter.route('/home', {
	name: 'home',

	action(params, queryParams) {
		KonchatNotification.getDesktopPermission();
		if (queryParams.saml_idp_credentialToken !== undefined) {
			Accounts.callLoginMethod({
				methodArguments: [{
					saml: true,
					credentialToken: queryParams.saml_idp_credentialToken,
				}],
				userCallback() { BlazeLayout.render('main', { center: 'home' }); },
			});
		} else {
			BlazeLayout.render('main', { center: 'home' });
		}
	},
});

FlowRouter.route('/directory', {
	name: 'directory',

	action() {
		BlazeLayout.render('main', { center: 'directory' });
	},
	triggersExit: [function() {
		$('.main-content').addClass('rc-old');
	}],
});

FlowRouter.route('/account/:group?', {
	name: 'account',

	action(params) {
		if (!params.group) {
			params.group = 'Preferences';
		}
		params.group = s.capitalize(params.group, true);
		BlazeLayout.render('main', { center: `account${ params.group }` });
	},
	triggersExit: [function() {
		$('.main-content').addClass('rc-old');
	}],
});

FlowRouter.route('/terms-of-service', {
	name: 'terms-of-service',

	action() {
		Session.set('cmsPage', 'Layout_Terms_of_Service');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/privacy-policy', {
	name: 'privacy-policy',

	action() {
		Session.set('cmsPage', 'Layout_Privacy_Policy');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/legal-notice', {
	name: 'legal-notice',

	action() {
		Session.set('cmsPage', 'Layout_Legal_Notice');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/room-not-found/:type/:name', {
	name: 'room-not-found',

	action(params) {
		Session.set('roomNotFound', { type: params.type, name: params.name });
		BlazeLayout.render('main', { center: 'roomNotFound' });
	},
});

FlowRouter.route('/fxos', {
	name: 'firefox-os-install',

	action() {
		BlazeLayout.render('fxOsInstallPrompt');
	},
});

FlowRouter.route('/register/:hash', {
	name: 'register-secret-url',

	action(/* params*/) {
		BlazeLayout.render('secretURL');

		// if RocketChat.settings.get('Accounts_RegistrationForm') is 'Secret URL'
		// 	Meteor.call 'checkRegistrationSecretURL', params.hash, (err, success) ->
		// 		if success
		// 			Session.set 'loginDefaultState', 'register'
		// 			BlazeLayout.render 'main', {center: 'home'}
		// 			KonchatNotification.getDesktopPermission()
		// 		else
		// 			BlazeLayout.render 'logoLayout', { render: 'invalidSecretURL' }
		// else
		// 	BlazeLayout.render 'logoLayout', { render: 'invalidSecretURL' }
	},
});

FlowRouter.route('/setup-wizard', {
	name: 'setup-wizard',

	action() {
		BlazeLayout.render('setupWizard');
	},
});

FlowRouter.route('/setup-wizard/final', {
	name: 'setup-wizard-final',

	action() {
		BlazeLayout.render('setupWizardFinal');
	},
});

FlowRouter.notFound = {
	action() {
		BlazeLayout.render('pageNotFound');
	},
};

