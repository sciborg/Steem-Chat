import './cloud.html';

import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { t } from '../../../utils';
import { SideNav } from '../../../ui-utils/client';

import queryString from 'query-string';
import toastr from 'toastr';

Template.cloud.onCreated(function() {
	const instance = this;
	instance.info = new ReactiveVar();
	instance.loading = new ReactiveVar(true);
	instance.isLoggedIn = new ReactiveVar(false);

	instance.loadRegStatus = function _loadRegStatus() {
		Meteor.call('cloud:checkRegisterStatus', (error, info) => {
			if (error) {
				console.warn('cloud:checkRegisterStatus', error);
				return;
			}

			instance.info.set(info);
			instance.loading.set(false);
		});
	};

	instance.getLoggedIn = function _getLoggedIn() {
		Meteor.call('cloud:checkUserLoggedIn', (error, result) => {
			if (error) {
				console.warn(error);
				return;
			}

			instance.isLoggedIn.set(result);
		});
	};

	instance.oauthAuthorize = function _oauthAuthorize() {
		Meteor.call('cloud:getOAuthAuthorizationUrl', (error, url) => {
			if (error) {
				console.warn(error);
				return;
			}

			window.location.href = url;
		});
	};

	instance.logout = function _logout() {
		Meteor.call('cloud:logout', (error) => {
			if (error) {
				console.warn(error);
				return;
			}

			instance.getLoggedIn();
		});
	};

	instance.connectWorkspace = function _connectWorkspace(token) {
		Meteor.call('cloud:connectWorkspace', token, (error, success) => {
			if (error) {
				toastr.error(error);
				instance.loadRegStatus();
				return;
			}

			if (!success) {
				toastr.error('An error occured connecting');
				instance.loadRegStatus();
				return;
			}

			toastr.success(t('Connected'));

			instance.loadRegStatus();
		});
	};

	instance.disconnectWorkspace = function _disconnectWorkspace() {
		Meteor.call('cloud:disconnectWorkspace', (error, success) => {
			if (error) {
				toastr.error(error);
				instance.loadRegStatus();
				return;
			}

			if (!success) {
				toastr.error('An error occured disconnecting');
				instance.loadRegStatus();
				return;
			}

			toastr.success(t('Disconnected'));

			instance.loadRegStatus();
		});
	};

	instance.syncWorkspace = function _syncWorkspace() {
		Meteor.call('cloud:syncWorkspace', (error, success) => {
			if (error) {
				toastr.error(error);
				instance.loadRegStatus();
				return;
			}

			if (!success) {
				toastr.error('An error occured syncing');
				instance.loadRegStatus();
				return;
			}

			toastr.success(t('Sync Complete'));

			instance.loadRegStatus();
		});
	};

	instance.registerWorkspace = function _registerWorkspace() {
		Meteor.call('cloud:registerWorkspace', (error, success) => {
			if (error) {
				toastr.error(error);
				instance.loadRegStatus();
				return;
			}

			if (!success) {
				toastr.error('An error occured');
				instance.loadRegStatus();
				return;
			}

			return instance.syncWorkspace();
		});
	};

	const params = queryString.parse(location.search);

	if (params.token) {
		instance.connectWorkspace(params.token);
	} else {
		instance.loadRegStatus();
	}

	instance.getLoggedIn();
});

Template.cloud.helpers({
	info() {
		return Template.instance().info.get();
	},
	isLoggedIn() {
		return Template.instance().isLoggedIn.get();
	},
});

Template.cloud.events({
	'click .update-email-btn'() {
		const val = $('input[name=cloudEmail]').val();

		Meteor.call('cloud:updateEmail', val, false, (error) => {
			if (error) {
				console.warn(error);
				return;
			}

			toastr.success(t('Saved'));
		});
	},

	'click .resend-email-btn'() {
		const val = $('input[name=cloudEmail]').val();

		Meteor.call('cloud:updateEmail', val, true, (error) => {
			if (error) {
				console.warn(error);
				return;
			}

			toastr.success(t('Requested'));
		});
	},

	'click .login-btn'(e, i) {
		i.oauthAuthorize();
	},

	'click .logout-btn'(e, i) {
		i.logout();
	},

	'click .connect-btn'(e, i) {
		const token = $('input[name=cloudToken]').val();

		i.connectWorkspace(token);
	},

	'click .register-btn'(e, i) {
		i.registerWorkspace();
	},

	'click .disconnect-btn'(e, i) {
		i.disconnectWorkspace();
	},

	'click .sync-btn'(e, i) {
		i.syncWorkspace();
	},
});

Template.cloud.onRendered(() => {
	Tracker.afterFlush(() => {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});

