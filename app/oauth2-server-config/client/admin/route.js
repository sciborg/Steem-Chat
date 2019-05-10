import { FlowRouter } from 'meteor/kadira:flow-router' ;
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { t } from '../../../utils';

FlowRouter.route('/admin/oauth-apps', {
	name: 'admin-oauth-apps',
	action() {
		return BlazeLayout.render('main', {
			center: 'oauthApps',
			pageTitle: t('OAuth_Applications'),
		});
	},
});

FlowRouter.route('/admin/oauth-app/:id?', {
	name: 'admin-oauth-app',
	action(params) {
		return BlazeLayout.render('main', {
			center: 'pageSettingsContainer',
			pageTitle: t('OAuth_Application'),
			pageTemplate: 'oauthApp',
			params,
		});
	},
});
