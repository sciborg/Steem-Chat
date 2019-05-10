import { DateFormat } from '../../../lib';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { roomTypes, getURL } from '../../../utils';
import { Subscriptions } from '../../../models';

const getAvatarUrl = (username) => getURL(`/avatar/${ username }?_dc=undefined`);
const getDMUrl = (username) => getURL(`/direct/${ username }`);

Template.ChatpalSearchResultTemplate.onCreated(function() {
	this.badRequest = new ReactiveVar(false);
	this.resultType = new ReactiveVar(this.data.settings.DefaultResultType);
	this.data.parentPayload.resultType = this.resultType.get();
});

Template.ChatpalSearchResultTemplate.events = {
	'click .chatpal-search-typefilter li'(evt, t) {
		t.data.parentPayload.resultType = evt.currentTarget.getAttribute('value');
		t.data.payload.start = 0;
		t.resultType.set(t.data.parentPayload.resultType);
		t.data.search();
	},
	'click .chatpal-paging-prev'(env, t) {
		t.data.payload.start -= t.data.settings.PageSize;
		t.data.search();
	},
	'click .chatpal-paging-next'(env, t) {
		t.data.payload.start = (t.data.payload.start || 0) + t.data.settings.PageSize;
		t.data.search();
	},
	'click .chatpal-show-more-messages'(evt, t) {
		t.data.parentPayload.resultType = 'Messages';
		t.data.payload.start = 0;
		t.data.payload.rows = t.data.settings.PageSize;
		t.resultType.set(t.data.parentPayload.resultType);
		t.data.search();
	},
};

Template.ChatpalSearchResultTemplate.helpers({
	result() {
		return Template.instance().data.result.get();
	},
	searching() {
		return Template.instance().data.searching.get();
	},
	resultType() {
		return Template.instance().resultType.get();
	},
	navSelected(type) {
		return Template.instance().resultType.get() === type ? 'selected' : '';
	},
	resultsFoundForAllSearch() {
		const result = Template.instance().data.result.get();

		if (!result) { return true; }

		return result.message.numFound > 0 || result.user.numFound > 0 || result.room.numFound > 0;
	},
	moreMessagesThanDisplayed() {
		const result = Template.instance().data.result.get();

		return result.message.docs.length < result.message.numFound;
	},
	resultNumFound() {
		const result = Template.instance().data.result.get();
		if (result) {
			switch (result.message.numFound) {
				case 0:
					return TAPi18n.__('Chatpal_no_search_results');
				case 1:
					return TAPi18n.__('Chatpal_one_search_result');
				default:
					return TAPi18n.__('Chatpal_search_results', result.message.numFound);
			}
		}
	},
	resultPaging() {
		const result = Template.instance().data.result.get();
		const pageSize = Template.instance().data.settings.PageSize;
		if (result) {
			return {
				currentPage: 1 + result.message.start / pageSize,
				numOfPages: Math.ceil(result.message.numFound / pageSize),
			};
		}
	},
});

Template.ChatpalSearchSingleMessage.helpers({
	roomIcon() {
		const room = Session.get(`roomData${ this.rid }`);
		if (room && room.t === 'd') {
			return 'at';
		}
		return roomTypes.getIcon(room);
	},

	roomLink() {
		const subscription = Subscriptions.findOne({ rid: this.rid });
		return roomTypes.getRouteLink(subscription.t, subscription);
	},

	roomName() {
		const room = Session.get(`roomData${ this.rid }`);
		return roomTypes.getRoomName(room.t, room);
	},

	time() {
		return DateFormat.formatTime(this.created);
	},
	date() {
		return DateFormat.formatDate(this.created);
	},
	getAvatarUrl,
});

Template.ChatpalSearchSingleRoom.helpers({
	roomIcon() {
		const room = Session.get(`roomData${ this._id }`);
		if (room && room.t === 'd') {
			return 'at';
		}
		return roomTypes.getIcon(room);
	},
	roomLink() {
		const subscription = Subscriptions.findOne({ rid: this._id });
		return roomTypes.getRouteLink(subscription.t, subscription);
	},
});

Template.ChatpalSearchSingleUser.helpers({
	cleanUsername() {
		return this.user_username.replace(/<\/?em>/ig, '');
	},
	getAvatarUrl,
	getDMUrl,
});
