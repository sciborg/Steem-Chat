/* globals */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import swal from 'sweetalert2';
import visitor from '../../imports/client/visitor';

Template.survey.events({
	'click button.skip'(e, instance) {
		instance.$('#survey').remove();
	},

	'click button.send'(e, instance) {
		const formData = instance.$('form').serializeArray();
		Meteor.call('livechat:saveSurveyFeedback', visitor.getToken(), visitor.getRoom(), formData, function(/* err, results*/) {
			instance.$('#survey').remove();
			swal({
				title: t('Thank_you_for_your_feedback'),
				type: 'success',
				timer: 2000,
			});
		});
	},
});
