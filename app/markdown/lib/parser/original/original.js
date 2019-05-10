/*
 * Markdown is a named function that will parse markdown syntax
 * @param {Object} message - The message object
 */
import { markdown } from './markdown.js';
import { code } from './code.js';

export const original = (message) => {
	// Parse markdown code
	message = code(message);

	// Parse markdown
	message = markdown(message);

	// Replace linebreak to br
	message.html = message.html.replace(/\n/gm, '<br>');

	return message;
};
