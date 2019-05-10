import { hasRole } from '../../../authorization';
import { Info } from '../../../utils';
import { API } from '../api';

API.default.addRoute('info', { authRequired: false }, {
	get() {
		const user = this.getLoggedInUser();

		if (user && hasRole(user._id, 'admin')) {
			return API.v1.success({
				info: Info,
			});
		}

		return API.v1.success({
			version: Info.version,
		});
	},
});
