import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { settings } from '../../../settings';
import { hasAtLeastOnePermission } from '../../../authorization';
import { TabBar } from '../../../ui-utils';

Meteor.startup(function() {
	Tracker.autorun(function() {
		if (settings.get('AutoTranslate_Enabled') && hasAtLeastOnePermission(['auto-translate'])) {
			return TabBar.addButton({
				groups: ['channel', 'group', 'direct'],
				id: 'autotranslate',
				i18nTitle: 'Auto_Translate',
				icon: 'language',
				template: 'autoTranslateFlexTab',
				order: 20,
			});
		}
		TabBar.removeButton('autotranslate');
	});
});
