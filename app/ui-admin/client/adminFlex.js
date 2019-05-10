import _ from 'underscore';
import s from 'underscore.string';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { settings } from '../../settings';
import { CachedCollection } from '../../ui-cached-collection';
import { menu, SideNav, AdminBox, Layout } from '../../ui-utils/client';
import { t } from '../../utils';

Template.adminFlex.onCreated(function() {
	this.isEmbedded = Layout.isEmbedded();
	this.settingsFilter = new ReactiveVar('');
	if (settings.cachedCollectionPrivate == null) {
		settings.cachedCollectionPrivate = new CachedCollection({
			name: 'private-settings',
			eventType: 'onLogged',
			useCache: false,
		});
		settings.collectionPrivate = settings.cachedCollectionPrivate.collection;
		settings.cachedCollectionPrivate.init();
	}
});

const label = function() {
	return TAPi18n.__(this.i18nLabel || this._id);
};

Template.adminFlex.helpers({
	groups() {
		const filter = Template.instance().settingsFilter.get();
		const query = {
			type: 'group',
		};
		if (filter) {
			const filterRegex = new RegExp(s.escapeRegExp(filter), 'i');
			const records = settings.collectionPrivate.find().fetch();
			let groups = [];
			records.forEach(function(record) {
				if (filterRegex.test(TAPi18n.__(record.i18nLabel || record._id))) {
					groups.push(record.group || record._id);
				}
			});
			groups = _.unique(groups);
			if (groups.length > 0) {
				query._id = {
					$in: groups,
				};
			}
		}
		return settings.collectionPrivate.find(query).fetch().map(function(el) {
			el.label = label.apply(el);
			return el;
		}).sort(function(a, b) {
			if (a.label.toLowerCase() >= b.label.toLowerCase()) {
				return 1;
			} else {
				return -1;
			}
		});
	},
	label,
	adminBoxOptions() {
		return AdminBox.getOptions();
	},
	menuItem(name, icon, section, group) {
		return {
			name: t(name),
			icon,
			pathSection: section,
			pathGroup: group,
			darken: true,
			isLightSidebar: true,
		};
	},
	embeddedVersion() {
		return this.isEmbedded;
	},
});

Template.adminFlex.events({
	'click [data-action="close"]'(e, instance) {
		if (instance.isEmbedded) {
			menu.close();
			return;
		}

		SideNav.closeFlex();
	},
	'keyup [name=settings-search]'(e, t) {
		t.settingsFilter.set(e.target.value);
	},
});
