import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { hasAllPermission } from '../../authorization';
import { popover, TabBar, Layout } from '../../ui-utils';
import { t } from '../../utils';
import _ from 'underscore';

const commonHelpers = {
	title() {
		return t(this.i18nTitle) || this.title;
	},
	active() {
		if (this.template === Template.instance().tabBar.getTemplate() && Template.instance().tabBar.getState() === 'opened') {
			return 'active';
		}
	},
};
function canShowAddUsersButton(rid) {
	const canAddToChannel = hasAllPermission(
		'add-user-to-any-c-room', rid
	);
	const canAddToGroup = hasAllPermission(
		'add-user-to-any-p-room', rid
	);
	const canAddToJoinedRoom = hasAllPermission(
		'add-user-to-joined-room', rid
	);
	if (
		!canAddToJoinedRoom &&
		!canAddToChannel &&
		Template.instance().tabBar.currentGroup() === 'channel'
	) {
		return false;
	}
	if (
		!canAddToJoinedRoom &&
		!canAddToGroup &&
		Template.instance().tabBar.currentGroup() === 'group'
	) {
		return false;
	}
	return true;
}
const filterButtons = (button, anonymous, rid) => {
	if (!Meteor.userId() && !anonymous) {
		return false;
	}
	if (button.groups.indexOf(Template.instance().tabBar.currentGroup()) === -1) {
		return false;
	}
	if (button.id === 'addUsers' && !canShowAddUsersButton(rid)) {
		return false;
	}
	return true;
};
Template.flexTabBar.helpers({
	headerData() {
		return Template.instance().tabBar.getData();
	},
	...commonHelpers,
	buttons() {
		return TabBar.getButtons().filter((button) =>
			filterButtons(button, this.anonymous, this.data && this.data.rid)
		);
	},
	opened() {
		return Template.instance().tabBar.getState();
	},

	template() {
		return Template.instance().tabBar.getTemplate();
	},

	flexData() {
		return Object.assign(Template.currentData().data || {}, {
			tabBar: Template.instance().tabBar,
		});
	},

	embeddedVersion() {
		return Layout.isEmbedded();
	},
});

const commonEvents = {
	'click .js-action'(e, t) {
		$('button', e.currentTarget).blur();
		e.preventDefault();
		const $flexTab = $('.flex-tab-container .flex-tab');

		if (t.tabBar.getState() === 'opened' && t.tabBar.getTemplate() === this.template) {
			$flexTab.attr('template', '');
			return t.tabBar.close();
		}

		if (this.action) {
			return this.action();
		}

		$flexTab.attr('template', this.template);
		t.tabBar.setData({
			label: this.i18nTitle,
			icon: this.icon,
		});
		t.tabBar.open(this);

		popover.close();
	},
};
const action = function(e, t) {
	$('button', e.currentTarget).blur();
	e.preventDefault();
	const $flexTab = $('.flex-tab-container .flex-tab');

	if (this.actionDefault) {
		return this.actionDefault();
	}
	if (t.tabBar.getState() === 'opened' && t.tabBar.getTemplate() === this.template) {
		$flexTab.attr('template', '');
		return t.tabBar.close();
	}
	$flexTab.attr('template', this.template);
	t.tabBar.setData({
		label: this.i18nTitle,
		icon: this.icon,
	});
	t.tabBar.open(this);

	popover.close();
};

Template.flexTabBar.events({
	'click .tab-button'(e, t) {
		e.preventDefault();
		const $flexTab = $('.flex-tab-container .flex-tab');

		if (t.tabBar.getState() === 'opened' && t.tabBar.getTemplate() === this.template) {
			$flexTab.attr('template', '');
			return t.tabBar.close();
		}

		$flexTab.attr('template', this.template);

		t.tabBar.open(this.id);
	},

	'click .close-flex-tab'(event, t) {
		t.tabBar.close();
	},
});

Template.flexTabBar.onCreated(function() {
	this.tabBar = Template.currentData().tabBar;
});


Template.RoomsActionMore.events({
	...commonEvents,
});


Template.RoomsActionMore.helpers({
	...commonHelpers,
});

Template.RoomsActionMore.onCreated(function() {
	this.tabBar = Template.currentData().tabBar;
});

Template.RoomsActionTab.events({
	...commonEvents,
	'click .js-more'(e, t) {
		$(e.currentTarget).blur();
		e.preventDefault();
		const buttons = TabBar.getButtons().filter((button) => filterButtons(button, t.anonymous, t.data.rid));
		const groups = [{ items:(t.small.get() ? buttons : buttons.slice(TabBar.size)).map((item) => ({
			...item,
			name: TAPi18n.__(item.i18nTitle),
			actionDefault: item.action !== action && item.action,
			action,
		})) }];
		const columns = [groups];
		columns[0] = { groups };
		const config = {
			columns,
			popoverClass: 'message-box',
			data: {
				rid: this._id,
				buttons: t.small.get() ? buttons : buttons.slice(TabBar.size),
				tabBar: t.tabBar,
			},
			currentTarget: e.currentTarget,
			offsetHorizontal: -e.currentTarget.clientWidth,
			offsetVertical: e.currentTarget.clientHeight + 10,
		};

		popover.open(config);
	},
});

Template.RoomsActionTab.onDestroyed(function() {
	$(window).off('resize', this.refresh);
});
Template.RoomsActionTab.onCreated(function() {
	this.small = new ReactiveVar(window.matchMedia('(max-width: 500px)').matches);
	this.refresh = _.throttle(() => {
		this.small.set(window.matchMedia('(max-width: 500px)').matches);
	}, 100);
	$(window).on('resize', this.refresh);
	this.tabBar = Template.currentData().tabBar;
});

Template.RoomsActionTab.helpers({
	...commonHelpers,

	postButtons() {
		const toolbar = Session.get('toolbarButtons') || {};
		return Object.keys(toolbar.buttons || []).map((key) => ({ id: key, ...toolbar.buttons[key] }));
	},

	active() {
		if (this.template === Template.instance().tabBar.getTemplate() && Template.instance().tabBar.getState() === 'opened') {
			return 'active';
		}
	},

	buttons() {
		if (Template.instance().small.get()) {
			return [];
		}
		const buttons = TabBar.getButtons()
			.filter((button) => filterButtons(button, Template.instance().anonymous, Template.instance().data.rid));
		return buttons.length <= TabBar.size ? buttons : buttons.slice(0, TabBar.size);
	},

	moreButtons() {
		if (Template.instance().small.get()) {
			return true;
		}
		const buttons = TabBar.getButtons()
			.filter((button) => filterButtons(button, Template.instance().anonymous, Template.instance().data.rid));
		return buttons.length > TabBar.size;
	},
});
