import { Meteor } from 'meteor/meteor';
import { DateFormat } from '../../lib';
import { Template } from 'meteor/templating';
import { getUserPreference, getURL } from '../../utils/client';
import { Users } from '../../models';
import { renderMessageBody } from '../../ui-utils';

const colors = {
	good: '#35AC19',
	warning: '#FCB316',
	danger: '#D30230',
};

Template.messageAttachment.helpers({
	parsedText() {
		return renderMessageBody({
			msg: this.text,
		});
	},
	markdownInPretext() {
		return this.mrkdwn_in && this.mrkdwn_in.includes('pretext');
	},
	parsedPretext() {
		return renderMessageBody({
			msg: this.pretext,
		});
	},
	loadImage() {
		if (this.downloadImages !== true) {
			const user = Users.findOne({ _id: Meteor.userId() }, { fields: { 'settings.autoImageLoad' : 1 } });
			if (getUserPreference(user, 'autoImageLoad') === false) {
				return false;
			}
			if (Meteor.Device.isPhone() && getUserPreference(user, 'saveMobileBandwidth') !== true) {
				return false;
			}
		}
		return true;
	},
	getImageHeight(height = 200) {
		return height;
	},
	color() {
		return colors[this.color] || this.color;
	},
	collapsed() {
		if (this.collapsed != null) {
			return this.collapsed;
		}
		return false;
	},
	mediaCollapsed() {
		if (this.collapsed != null) {
			return this.collapsed;
		} else {
			return getUserPreference(Meteor.userId(), 'collapseMediaByDefault') === true;
		}
	},
	time() {
		const messageDate = new Date(this.ts);
		const today = new Date();
		if (messageDate.toDateString() === today.toDateString()) {
			return DateFormat.formatTime(this.ts);
		}
		return DateFormat.formatDateAndTime(this.ts);
	},
	injectIndex(data, previousIndex, index) {
		data.index = `${ previousIndex }.attachments.${ index }`;
	},

	isFile() {
		return this.type === 'file';
	},
	isPDF() {
		if (this.type === 'file' && this.title_link.endsWith('.pdf') && Template.parentData().msg.file) {
			this.fileId = Template.parentData().msg.file._id;
			return true;
		}
		return false;
	},
	getURL,
});
