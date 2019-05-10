import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { TAPi18n } from 'meteor/tap:i18n';
import { settings } from '../../../settings';
import { handleError } from '../../../utils';
import toastr from 'toastr';
import { SideNav } from '../../../ui-utils/client';

Template.mailer.helpers({
	fromEmail() {
		return settings.get('From_Email');
	},
});

Template.mailer.events({
	'click .send'(e, t) {
		e.preventDefault();
		const from = $(t.find('[name=from]')).val();
		const subject = $(t.find('[name=subject]')).val();
		const body = $(t.find('[name=body]')).val();
		const dryrun = $(t.find('[name=dryrun]:checked')).val();
		const query = $(t.find('[name=query]')).val();
		if (!from) {
			toastr.error(TAPi18n.__('error-invalid-from-address'));
			return;
		}
		if (body.indexOf('[unsubscribe]') === -1) {
			toastr.error(TAPi18n.__('error-missing-unsubscribe-link'));
			return;
		}
		return Meteor.call('Mailer.sendMail', from, subject, body, dryrun, query, function(err) {
			if (err) {
				return handleError(err);
			}
			return toastr.success(TAPi18n.__('The_emails_are_being_sent'));
		});
	},
});

Template.mailer.onRendered(() => {
	Tracker.afterFlush(() => {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});
