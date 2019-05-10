import { Template } from 'meteor/templating';
import './messageBoxReplyPreview.html';


Template.messageBoxReplyPreview.events({
	'click .cancel-reply'(event) {
		event.preventDefault();
		event.stopPropagation();

		const { mid } = event.currentTarget.dataset;
		const $input = $(this.input);

		this.input.focus();
		const messages = $input.data('reply') || [];
		const filtered = messages.filter(({ _id }) => _id !== mid);

		$input.data('reply', filtered).trigger('dataChange');
	},
});
