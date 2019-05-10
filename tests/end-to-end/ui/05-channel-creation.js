import sideNav from '../../pageobjects/side-nav.page';
import { publicChannelName, privateChannelName } from '../../data/channel.js';
import { targetUser } from '../../data/interactions.js';

// test data imports
import { checkIfUserIsValid, setPublicChannelCreated, setPrivateChannelCreated, setDirectMessageCreated } from '../../data/checks';
import { username, email, password } from '../../data/user.js';
// Basic usage test start
describe('[Channel creation]', function() {
	before(() => {
		checkIfUserIsValid(username, email, password);
	});

	afterEach(function() {
		if (this.currentTest.state !== 'passed') {
			setPublicChannelCreated(false);
			switch (this.currentTest.title) {
				case 'create a public channel':
					setPublicChannelCreated(false);
					console.log('Public channel Not Created!');
					break;
				case 'create a private channel':
					setPrivateChannelCreated(false);
					console.log('Private channel Not Created!');
					break;
				case 'start a direct message with rocket.cat':
					setDirectMessageCreated(false);
					console.log('Direct Message Not Created!');
					break;
			}
		}
	});

	describe('public channel:', function() {
		it('it should create a public channel', function() {
			sideNav.createChannel(publicChannelName, false, false);
			setPublicChannelCreated(true);
		});
	});

	describe('private channel:', function() {
		it('it should create a private channel', function() {
			sideNav.createChannel(privateChannelName, true, false);
			setPrivateChannelCreated(true);
		});
	});

	describe('direct message:', function() {
		it('it should start a direct message with rocket.cat', function() {
			sideNav.spotlightSearchIcon.click();
			sideNav.spotlightSearch.waitForVisible(10000);
			sideNav.searchChannel(targetUser);
			setDirectMessageCreated(true);
		});
	});
});
