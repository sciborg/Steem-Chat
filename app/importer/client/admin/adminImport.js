import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Importers } from '..';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { hasRole } from '../../../authorization';
import { t, handleError } from '../../../utils';
import { SideNav } from '../../../ui-utils/client';

Template.adminImport.helpers({
	isAdmin() {
		return hasRole(Meteor.userId(), 'admin');
	},
	getDescription(importer) {
		return TAPi18n.__('Importer_From_Description', { from: importer.name });
	},
	importers() {
		return Importers.getAll();
	},
});

Template.adminImport.events({
	'click .import-history'() {
		FlowRouter.go('/admin/import/history');
	},

	'click .start-import'() {
		const importer = this;

		Meteor.call('setupImporter', importer.key, function(error) {
			if (error) {
				console.log(t('importer_setup_error'), importer.key, error);
				handleError(error);
				return;
			}

			FlowRouter.go(`/admin/import/prepare/${ importer.key }`);
		});
	},
});

Template.adminImport.onRendered(() => {
	Tracker.afterFlush(() => {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});
