import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { ChatRoom } from '../../../../../models';
import { t } from '../../../../../utils';
import { LivechatVisitor } from '../../../collections/LivechatVisitor';
import toastr from 'toastr';
import './visitorEdit.html';

Template.visitorEdit.helpers({
	visitor() {
		return Template.instance().visitor.get();
	},

	room() {
		return Template.instance().room.get();
	},

	email() {
		const visitor = Template.instance().visitor.get();
		if (visitor.visitorEmails && visitor.visitorEmails.length > 0) {
			return visitor.visitorEmails[0].address;
		}
	},

	phone() {
		const visitor = Template.instance().visitor.get();
		if (visitor.phone && visitor.phone.length > 0) {
			return visitor.phone[0].phoneNumber;
		}
	},

	joinTags() {
		return this.tags && this.tags.join(', ');
	},
});

Template.visitorEdit.onCreated(function() {
	this.visitor = new ReactiveVar();
	this.room = new ReactiveVar();

	this.autorun(() => {
		this.visitor.set(LivechatVisitor.findOne({ _id: Template.currentData().visitorId }));
	});

	this.autorun(() => {
		this.room.set(ChatRoom.findOne({ _id: Template.currentData().roomId }));
	});
});

Template.visitorEdit.events({
	'submit form'(event, instance) {
		event.preventDefault();
		const userData = { _id: instance.visitor.get()._id };
		const roomData = { _id: instance.room.get()._id };

		userData.name = event.currentTarget.elements.name.value;
		userData.email = event.currentTarget.elements.email.value;
		userData.phone = event.currentTarget.elements.phone.value;

		roomData.topic = event.currentTarget.elements.topic.value;
		roomData.tags = event.currentTarget.elements.tags.value;

		Meteor.call('livechat:saveInfo', userData, roomData, (err) => {
			if (err) {
				toastr.error(t(err.error));
			} else {
				toastr.success(t('Saved'));
			}
		});
	},

	'click .save'() {
		this.save();
	},

	'click .cancel'() {
		this.cancel();
	},
});
