import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { SideNav, TabBar, RocketChatTabBar } from '../../../ui-utils';
import _ from 'underscore';
import s from 'underscore.string';

Template.adminUsers.helpers({
	searchText() {
		const instance = Template.instance();
		return instance.filter && instance.filter.get();
	},
	isReady() {
		const instance = Template.instance();
		return instance.ready && instance.ready.get();
	},
	users() {
		return Template.instance().users();
	},
	isLoading() {
		const instance = Template.instance();
		if (!(instance.ready && instance.ready.get())) {
			return 'btn-loading';
		}
	},
	hasMore() {
		const instance = Template.instance();
		const users = instance.users();
		if (instance.limit && instance.limit.get() && users && users.length) {
			return instance.limit.get() === users.length;
		}
	},
	emailAddress() {
		return _.map(this.emails, function(e) { return e.address; }).join(', ');
	},
	flexData() {
		return {
			tabBar: Template.instance().tabBar,
			data: Template.instance().tabBarData.get(),
		};
	},
	onTableScroll() {
		const instance = Template.instance();
		return function(currentTarget) {
			if (
				currentTarget.offsetHeight + currentTarget.scrollTop >=
				currentTarget.scrollHeight - 100
			) {
				return instance.limit.set(instance.limit.get() + 50);
			}
		};
	},
	// onTableItemClick() {
	// 	const instance = Template.instance();
	// 	return function(item) {
	// 		Session.set('adminRoomsSelected', {
	// 			rid: item._id,
	// 		});
	// 		instance.tabBar.open('admin-room');
	// 	};
	// },
});

Template.adminUsers.onCreated(function() {
	const instance = this;
	this.limit = new ReactiveVar(50);
	this.filter = new ReactiveVar('');
	this.ready = new ReactiveVar(true);
	this.tabBar = new RocketChatTabBar();
	this.tabBar.showGroup(FlowRouter.current().route.name);
	this.tabBarData = new ReactiveVar;
	TabBar.addButton({
		groups: ['admin-users'],
		id: 'invite-user',
		i18nTitle: 'Invite_Users',
		icon: 'send',
		template: 'adminInviteUser',
		order: 1,
	});
	TabBar.addButton({
		groups: ['admin-users'],
		id: 'add-user',
		i18nTitle: 'Add_User',
		icon: 'plus',
		template: 'adminUserEdit',
		order: 2,
	});
	TabBar.addButton({
		groups: ['admin-users'],
		id: 'admin-user-info',
		i18nTitle: 'User_Info',
		icon: 'user',
		template: 'adminUserInfo',
		order: 3,
	});
	this.autorun(function() {
		const filter = instance.filter.get();
		const limit = instance.limit.get();
		const subscription = instance.subscribe('fullUserData', filter, limit);
		instance.ready.set(subscription.ready());
	});
	this.users = function() {
		let filter;
		let query;

		if (instance.filter && instance.filter.get()) {
			filter = s.trim(instance.filter.get());
		}

		if (filter) {
			const filterReg = new RegExp(s.escapeRegExp(filter), 'i');
			query = { $or: [{ username: filterReg }, { name: filterReg }, { 'emails.address': filterReg }] };
		} else {
			query = {};
		}
		query.type = {
			$in: ['user', 'bot'],
		};

		const limit = instance.limit && instance.limit.get();
		return Meteor.users.find(query, { limit, sort: { username: 1, name: 1 } }).fetch();
	};
});

Template.adminUsers.onRendered(function() {
	Tracker.afterFlush(function() {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});

const DEBOUNCE_TIME_FOR_SEARCH_USERS_IN_MS = 300;

Template.adminUsers.events({
	'keydown #users-filter'(e) {
		if (e.which === 13) {
			e.stopPropagation();
			e.preventDefault();
		}
	},
	'keyup #users-filter': _.debounce((e, t) => {
		e.stopPropagation();
		e.preventDefault();
		t.filter.set(e.currentTarget.value);
	}, DEBOUNCE_TIME_FOR_SEARCH_USERS_IN_MS),
	'click .user-info'(e, instance) {
		e.preventDefault();
		instance.tabBarData.set(Meteor.users.findOne(this._id));
		instance.tabBar.open('admin-user-info');
	},
	'click .info-tabs button'(e) {
		e.preventDefault();
		$('.info-tabs button').removeClass('active');
		$(e.currentTarget).addClass('active');
		$('.user-info-content').hide();
		$($(e.currentTarget).attr('href')).show();
	},
	'click .load-more'(e, t) {
		e.preventDefault();
		e.stopPropagation();
		t.limit.set(t.limit.get() + 50);
	},
});
