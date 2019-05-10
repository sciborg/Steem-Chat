import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Blaze } from 'meteor/blaze';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoComplete } from 'meteor/mizzao:autocomplete';
import { ChatRoom } from '../../../models';
import { t, isEmail, handleError, roomTypes } from '../../../utils';
import { settings } from '../../../settings';
import { Deps } from 'meteor/deps';
import toastr from 'toastr';
import resetSelection from '../resetSelection';

const filterNames = (old) => {
	const reg = new RegExp(`^${ settings.get('UTF8_Names_Validation') }$`);
	return [...old.replace(' ', '').toLocaleLowerCase()].filter((f) => reg.test(f)).join('');
};

Template.mailMessagesInstructions.helpers({
	name() {
		return Meteor.user().name;
	},
	email() {
		const { emails } = Meteor.user();
		return emails && emails[0] && emails[0].address;
	},
	roomName() {
		const room = ChatRoom.findOne(Session.get('openedRoom'));
		return room && roomTypes.getRoomName(room.t, room);
	},
	erroredEmails() {
		const instance = Template.instance();
		return instance && instance.erroredEmails.get().join(', ');
	},
	autocompleteSettings() {
		return {
			limit: 10,
			rules: [
				{
					collection: 'CachedChannelList',
					subscription: 'userAutocomplete',
					field: 'username',
					template: Template.userSearch,
					noMatchTemplate: Template.userSearchEmpty,
					matchAll: true,
					filter: {
						exceptions: Template.instance().selectedUsers.get(),
					},
					selector(match) {
						return {
							term: match,
						};
					},
					sort: 'username',
				},
			],
		};
	},
	selectedUsers() {
		return Template.instance().selectedUsers.get();
	},
	selectedEmails() {
		return Template.instance().selectedEmails.get();
	},
	selectedMessages() {
		return Template.instance().selectedMessages.get();
	},
	config() {
		const filter = Template.instance().userFilter;
		return {
			filter: filter.get(),
			noMatchTemplate: 'userSearchEmpty',
			modifier(text) {
				const f = filter.get();
				return `@${ f.length === 0 ? text : text.replace(new RegExp(filter.get()), function(part) {
					return `<strong>${ part }</strong>`;
				}) }`;
			},
		};
	},
	autocomplete(key) {
		const instance = Template.instance();
		const param = instance.ac[key];
		return typeof param === 'function' ? param.apply(instance.ac) : param;
	},
	items() {
		return Template.instance().ac.filteredList();
	},
	errorMessage() {
		return Template.instance().errorMessage.get();
	},
});

Template.mailMessagesInstructions.events({
	'click .js-cancel, click .mail-messages__instructions--selected'(e, t) {
		t.reset(true);
	},
	'click .js-send'(e, instance) {
		const { selectedUsers, selectedEmails, selectedMessages } = instance;
		const $emailsInput = instance.$('[name="emails"]');
		const subject = instance.$('[name="subject"]').val();

		if (!selectedUsers.get().length && !selectedEmails.get().length && $emailsInput.val().trim() === '') {
			instance.errorMessage.set(t('Mail_Message_Missing_to'));
			return false;
		}

		if ($emailsInput.val() !== '') {
			if (isEmail($emailsInput.val())) {
				const emailsArr = selectedEmails.get();
				emailsArr.push({ text: $emailsInput.val() });
				$('[name="emails"]').val('');
				selectedEmails.set(emailsArr);
			} else {
				instance.errorMessage.set(t('Mail_Message_Invalid_emails', $emailsInput.val()));
				return false;
			}
		}

		if (!selectedMessages.get().length) {
			instance.errorMessage.set(t('Mail_Message_No_messages_selected_select_all'));
			return false;
		}

		const data = {
			rid: Session.get('openedRoom'),
			to_users: selectedUsers.get().map((user) => user.username),
			to_emails: selectedEmails.get().map((email) => email.text).toString(),
			subject,
			messages: selectedMessages.get(),
			language: localStorage.getItem('userLanguage'),
		};

		Meteor.call('mailMessages', data, function(err, result) {
			if (err != null) {
				return handleError(err);
			}
			console.log(result);
			toastr.success(t('Your_email_has_been_queued_for_sending'));
			instance.reset(true);
		});
	},
	'click .rc-input--usernames .rc-tags__tag'({ target }, t) {
		const { username } = Blaze.getData(target);
		t.selectedUsers.set(t.selectedUsers.get().filter((user) => user.username !== username));
	},
	'click .rc-input--emails .rc-tags__tag'({ target }, t) {
		const { text } = Blaze.getData(target);
		t.selectedEmails.set(t.selectedEmails.get().filter((email) => email.text !== text));
	},
	'click .rc-popup-list__item'(e, t) {
		t.ac.onItemClick(this, e);
	},
	'input [name="users"]'(e, t) {
		const input = e.target;
		const position = input.selectionEnd || input.selectionStart;
		const { length } = input.value;
		const modified = filterNames(input.value);
		input.value = modified;
		document.activeElement === input && e && /input/i.test(e.type) && (input.selectionEnd = position + input.value.length - length);

		t.userFilter.set(modified);
	},
	'keydown [name="emails"]'(e, t) {
		const input = e.target;
		if ([9, 13, 188].includes(e.keyCode) && isEmail(input.value)) {
			e.preventDefault();
			const emails = t.selectedEmails;
			const emailsArr = emails.get();
			emailsArr.push({ text: input.value });
			input.value = '';
			return emails.set(emailsArr);
		}

		if ([8, 46].includes(e.keyCode) && input.value === '') {
			const emails = t.selectedEmails;
			const emailsArr = emails.get();
			emailsArr.pop();
			return emails.set(emailsArr);
		}
	},
	'keydown [name="users"]'(e, t) {
		if ([8, 46].includes(e.keyCode) && e.target.value === '') {
			const users = t.selectedUsers;
			const usersArr = users.get();
			usersArr.pop();
			return users.set(usersArr);
		}

		t.ac.onKeyDown(e);
	},
	'keyup [name="users"]'(e, t) {
		t.ac.onKeyUp(e);
	},
	'focus [name="users"]'(e, t) {
		t.ac.onFocus(e);
	},
	'blur [name="users"]'(e, t) {
		t.ac.onBlur(e);
	},
});

Template.mailMessagesInstructions.onRendered(function() {
	const users = this.selectedUsers;

	this.firstNode.querySelector('[name="users"]').focus();
	this.ac.element = this.firstNode.querySelector('[name="users"]');
	this.ac.$element = $(this.ac.element);
	this.ac.$element.on('autocompleteselect', function(e, { item }) {
		const usersArr = users.get();
		usersArr.push(item);
		users.set(usersArr);
	});

	const { selectedMessages } = this;

	$('.messages-box .message').on('click', function() {
		const { id } = this;
		const messages = selectedMessages.get();

		if ($(this).hasClass('selected')) {
			selectedMessages.set(messages.filter((message) => message !== id));
		} else {
			selectedMessages.set(messages.concat(id));
		}
	});
});

Template.mailMessagesInstructions.onCreated(function() {
	resetSelection(true);

	this.selectedEmails = new ReactiveVar([]);
	this.selectedMessages = new ReactiveVar([]);
	this.errorMessage = new ReactiveVar('');
	this.selectedUsers = new ReactiveVar([]);
	this.userFilter = new ReactiveVar('');

	const filter = { exceptions :[Meteor.user().username].concat(this.selectedUsers.get().map((u) => u.username)) };
	Deps.autorun(() => {
		filter.exceptions = [Meteor.user().username].concat(this.selectedUsers.get().map((u) => u.username));
	});

	this.ac = new AutoComplete(
		{
			selector:{
				item: '.rc-popup-list__item',
				container: '.rc-popup-list__list',
			},
			position: 'fixed',
			limit: 10,
			inputDelay: 300,
			rules: [
				{
					collection: 'UserAndRoom',
					subscription: 'userAutocomplete',
					field: 'username',
					matchAll: true,
					filter,
					doNotChangeWidth: false,
					selector(match) {
						return { term: match };
					},
					sort: 'username',
				},
			],

		});
	this.ac.tmplInst = this;

	this.reset = (bool) => {
		this.selectedUsers.set([]);
		this.selectedEmails.set([]);
		this.selectedMessages.set([]);
		this.errorMessage.set('');
		resetSelection(bool);
	};
});

Template.mailMessagesInstructions.onDestroyed(function() {
	Template.instance().reset(false);
});
