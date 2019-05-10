import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { modal } from '../../../../../ui-utils';
import { t, handleError } from '../../../../../utils';
import { LivechatIntegration } from '../../../collections/LivechatIntegration';
import _ from 'underscore';
import s from 'underscore.string';
import toastr from 'toastr';
import './livechatIntegrationWebhook.html';

Template.livechatIntegrationWebhook.helpers({
	webhookUrl() {
		const setting = LivechatIntegration.findOne('Livechat_webhookUrl');
		return setting && setting.value;
	},
	secretToken() {
		const setting = LivechatIntegration.findOne('Livechat_secret_token');
		return setting && setting.value;
	},
	disableTest() {
		return Template.instance().disableTest.get();
	},
	sendOnCloseChecked() {
		const setting = LivechatIntegration.findOne('Livechat_webhook_on_close');
		return setting && setting.value;
	},
	sendOnOfflineChecked() {
		const setting = LivechatIntegration.findOne('Livechat_webhook_on_offline_msg');
		return setting && setting.value;
	},
	sendOnVisitorMessageChecked() {
		const setting = LivechatIntegration.findOne('Livechat_webhook_on_visitor_message');
		return setting && setting.value;
	},
	sendOnAgentMessageChecked() {
		const setting = LivechatIntegration.findOne('Livechat_webhook_on_agent_message');
		return setting && setting.value;
	},
});

Template.livechatIntegrationWebhook.onCreated(function() {
	this.disableTest = new ReactiveVar(true);

	this.autorun(() => {
		const webhook = LivechatIntegration.findOne('Livechat_webhookUrl');
		this.disableTest.set(!webhook || _.isEmpty(webhook.value));
	});

	this.subscribe('livechat:integration');
});

Template.livechatIntegrationWebhook.events({
	'change #webhookUrl, blur #webhookUrl'(e, instance) {
		const setting = LivechatIntegration.findOne('Livechat_webhookUrl');
		instance.disableTest.set(!setting || e.currentTarget.value !== setting.value);
	},
	'click .test'(e, instance) {
		if (!instance.disableTest.get()) {
			Meteor.call('livechat:webhookTest', (err) => {
				if (err) {
					return handleError(err);
				}
				modal.open({
					title: t('It_works'),
					type: 'success',
					timer: 2000,
				});
			});
		}
	},
	'click .reset-settings'(e, instance) {
		e.preventDefault();

		const webhookUrl = LivechatIntegration.findOne('Livechat_webhookUrl');
		const secretToken = LivechatIntegration.findOne('Livechat_secret_token');
		const webhookOnClose = LivechatIntegration.findOne('Livechat_webhook_on_close');
		const webhookOnOfflineMsg = LivechatIntegration.findOne('Livechat_webhook_on_offline_msg');
		const webhookOnVisitorMessage = LivechatIntegration.findOne('Livechat_webhook_on_visitor_message');
		const webhookOnAgentMessage = LivechatIntegration.findOne('Livechat_webhook_on_agent_message');

		instance.$('#webhookUrl').val(webhookUrl && webhookUrl.value);
		instance.$('#secretToken').val(secretToken && secretToken.value);
		instance.$('#sendOnClose').get(0).checked = webhookOnClose && webhookOnClose.value;
		instance.$('#sendOnOffline').get(0).checked = webhookOnOfflineMsg && webhookOnOfflineMsg.value;
		instance.$('#sendOnVisitorMessage').get(0).checked = webhookOnVisitorMessage && webhookOnVisitorMessage.value;
		instance.$('#sendOnAgentMessage').get(0).checked = webhookOnAgentMessage && webhookOnAgentMessage.value;

		instance.disableTest.set(!webhookUrl || _.isEmpty(webhookUrl.value));
	},
	'submit .rocket-form'(e, instance) {
		e.preventDefault();

		const settings = {
			Livechat_webhookUrl: s.trim(instance.$('#webhookUrl').val()),
			Livechat_secret_token: s.trim(instance.$('#secretToken').val()),
			Livechat_webhook_on_close: instance.$('#sendOnClose').get(0).checked,
			Livechat_webhook_on_offline_msg: instance.$('#sendOnOffline').get(0).checked,
			Livechat_webhook_on_visitor_message: instance.$('#sendOnVisitorMessage').get(0).checked,
			Livechat_webhook_on_agent_message: instance.$('#sendOnAgentMessage').get(0).checked,
		};
		Meteor.call('livechat:saveIntegration', settings, (err) => {
			if (err) {
				return handleError(err);
			}
			toastr.success(t('Saved'));
		});
	},
});
