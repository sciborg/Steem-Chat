import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router' ;
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Template } from 'meteor/templating';
import { ChatOAuthApps } from '../admin/collection';
import { Accounts } from 'meteor/accounts-base';

FlowRouter.route('/oauth/authorize', {
	action(params, queryParams) {
		BlazeLayout.render('main', {
			center: 'authorize',
			modal: true,
			client_id: queryParams.client_id,
			redirect_uri: queryParams.redirect_uri,
			response_type: queryParams.response_type,
			state: queryParams.state,
		});
	},
});

FlowRouter.route('/oauth/error/:error', {
	action(params) {
		BlazeLayout.render('main', {
			center: 'oauth404',
			modal: true,
			error: params.error,
		});
	},
});

Template.authorize.onCreated(function() {
	this.subscribe('authorizedOAuth');
	this.subscribe('oauthClient', this.data.client_id());
});

Template.authorize.helpers({
	getToken() {
		return localStorage.getItem(Accounts.LOGIN_TOKEN_KEY);
	},
	getClient() {
		return ChatOAuthApps.findOne();
	},
});

Template.authorize.events({
	'click #logout-oauth'() {
		return Meteor.logout();
	},
	'click #cancel-oauth'() {
		return window.close();
	},
});

Template.authorize.onRendered(function() {
	this.autorun((c) => {
		const user = Meteor.user();
		if (user && user.oauth && user.oauth.authorizedClients && user.oauth.authorizedClients.includes(this.data.client_id())) {
			c.stop();
			$('button[type=submit]').click();
		}
	});
});
