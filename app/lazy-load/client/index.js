import { Blaze } from 'meteor/blaze';
import _ from 'underscore';
import './lazyloadImage';

const getEl = (el, instance) => (instance && instance.firstNode) || el;

const loadImage = (el, instance) => {
	const element = getEl(el, instance);
	const img = new Image();
	const src = element.getAttribute('data-src');
	img.onload = () => {
		if (instance) {
			instance.loaded.set(true);
		} else {
			element.className = element.className.replace('lazy-img', '');
			element.src = src;
		}
		element.removeAttribute('data-src');
	};
	img.src = src;
};

const isVisible = (el, instance) => {
	requestAnimationFrame(() => {
		const rect = getEl(el, instance).getBoundingClientRect();
		if (rect.top >= -100 && rect.left >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight)) {
			return loadImage(el, instance);
		}
	});

};

window.addEventListener('resize', window.lazyloadtick);

export const lazyloadtick = _.debounce(() => {
	const lazyImg = document.querySelectorAll('.lazy-img[data-src]');
	Array.from(lazyImg).forEach((el) =>
		isVisible(el, Blaze.getView(el)._templateInstance)
	);
}, 300);

window.lazyloadtick = lazyloadtick;

export const addImage = (instance) => isVisible(instance.firstNode, instance);
