// http://stackoverflow.com/a/26990347 function isSet() from Gajus
export const isSet = function(fn) {
	let value;
	try {
		value = fn();
	} catch (e) {
		value = undefined;
	} finally {
		return value !== undefined;
	}
};

export const isSetNotNull = function(fn) {
	let value;
	try {
		value = fn();
	} catch (e) {
		value = null;
	} finally {
		return value !== null && value !== undefined;
	}
};
