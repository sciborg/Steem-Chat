import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { t } from '../../utils';

FlowRouter.route('/admin/integrations', {
	name: 'admin-integrations',
	subscriptions() {
		this.register('integrations', Meteor.subscribe('integrations'));
	},
	action() {
		return BlazeLayout.render('main', {
			center: 'integrations',
			pageTitle: t('Integrations'),
		});
	},
});

FlowRouter.route('/admin/integrations/new', {
	name: 'admin-integrations-new',
	subscriptions() {
		this.register('integrations', Meteor.subscribe('integrations'));
	},
	action() {
		return BlazeLayout.render('main', {
			center: 'integrationsNew',
			pageTitle: t('Integration_New'),
		});
	},
});

FlowRouter.route('/admin/integrations/incoming/:id?', {
	name: 'admin-integrations-incoming',
	subscriptions() {
		this.register('integrations', Meteor.subscribe('integrations'));
	},
	action(params) {
		return BlazeLayout.render('main', {
			center: 'pageSettingsContainer',
			pageTitle: t('Integration_Incoming_WebHook'),
			pageTemplate: 'integrationsIncoming',
			params,
		});
	},
});

FlowRouter.route('/admin/integrations/outgoing/:id?', {
	name: 'admin-integrations-outgoing',
	action(params) {
		return BlazeLayout.render('main', {
			center: 'integrationsOutgoing',
			pageTitle: t('Integration_Outgoing_WebHook'),
			params,
		});
	},
});

FlowRouter.route('/admin/integrations/outgoing/:id?/history', {
	name: 'admin-integrations-outgoing-history',
	action(params) {
		return BlazeLayout.render('main', {
			center: 'integrationsOutgoingHistory',
			pageTitle: t('Integration_Outgoing_WebHook_History'),
			params,
		});
	},
});

FlowRouter.route('/admin/integrations/additional/zapier', {
	name: 'admin-integrations-additional-zapier',
	action() {
		BlazeLayout.render('main', {
			center: 'integrationsAdditionalZapier',
		});
	},
});
