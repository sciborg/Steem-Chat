import { settings } from '../../settings';
import { callbacks } from '../../callbacks';
import s from 'underscore.string';

//
// IssueLink is a named function that will add issue links
// @param {Object} message - The message object
//

function IssueLink(message) {
	if (s.trim(message.html) && settings.get('IssueLinks_Enabled')) {
		message.html = message.html.replace(/(?:^|\s|\n)(#[0-9]+)\b/g, function(match, issueNumber) {
			const url = settings.get('IssueLinks_Template').replace('%s', issueNumber.substring(1));
			return match.replace(issueNumber, `<a href="${ url }" target="_blank">${ issueNumber }</a>`);
		});
	}
	return message;
}

callbacks.add('renderMessage', IssueLink, callbacks.priority.MEDIUM, 'issuelink');
