import { Migrations } from '../../../app/migrations';
import { Settings } from '../../../app/models';

Migrations.add({
	version: 34,
	up() {
		return Settings.update({
			_id: 'Layout_Login_Header',
			value: '<a class="logo" href="/"><img src="/assets/logo/logo.svg?v=3" /></a>',
		}, {
			$set: {
				value: '<a class="logo" href="/"><img src="/assets/logo?v=3" /></a>',
			},
		});
	},
});
