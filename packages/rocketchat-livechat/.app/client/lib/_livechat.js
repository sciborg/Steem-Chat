import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { TAPi18n } from 'meteor/tap:i18n';
import visitor from '../../imports/client/visitor';

this.Livechat = new (class Livechat {
	constructor() {
		this._online = new ReactiveVar(null);

		this._customColor = new ReactiveVar();
		this._onlineColor = new ReactiveVar('#C1272D');
		this._offlineColor = new ReactiveVar('#666666');

		this._customFontColor = new ReactiveVar();
		this._onlineFontColor = new ReactiveVar('#FFFFFF');
		this._offlineFontColor = new ReactiveVar('#FFFFFF');

		this._title = new ReactiveVar('Rocket.Chat');
		this._registrationForm = new ReactiveVar(true);
		this._showSwitchDepartmentForm = new ReactiveVar(false);
		this._allowSwitchingDepartments = new ReactiveVar(false);
		this._offlineMessage = new ReactiveVar('');
		this._offlineUnavailableMessage = new ReactiveVar('');
		this._displayOfflineForm = new ReactiveVar(true);
		this._offlineSuccessMessage = new ReactiveVar(TAPi18n.__('Thanks_We_ll_get_back_to_you_soon'));
		this._videoCall = new ReactiveVar(false);
		this._fileUpload = new ReactiveVar(false);
		this._transcriptMessage = new ReactiveVar('');
		this._conversationFinishedMessage = new ReactiveVar('');
		this._nameFieldRegistrationForm = new ReactiveVar(false);
		this._emailFieldRegistrationForm = new ReactiveVar(false);
		this._connecting = new ReactiveVar(false);
		this._room = new ReactiveVar(null);
		this._department = new ReactiveVar(null);
		this._widgetOpened = new ReactiveVar(false);
		this._ready = new ReactiveVar(false);
		this._agent = new ReactiveVar();
		this._registrationFormMessage = new ReactiveVar('');

		this.stream = new Meteor.Streamer('livechat-room');

		this._guestName = new ReactiveVar();
		this._guestEmail = new ReactiveVar();

		Tracker.autorun(() => {
			if (this._room.get() && visitor.getId()) {
				RoomHistoryManager.getMoreIfIsEmpty(this._room.get());
				visitor.subscribeToRoom(this._room.get());
				visitor.setRoom(this._room.get());

				Meteor.call('livechat:getAgentData', { roomId: this._room.get(), token: visitor.getToken() }, (error, result) => {
					if (!error) {
						this._agent.set(result);
					}
				});
				this.stream.on(this._room.get(), { visitorToken: visitor.getToken() }, (eventData) => {
					if (!eventData || !eventData.type) {
						return;
					}

					if (eventData.type === 'agentData') {
						this._agent.set(eventData.data);
					}
				});
			}
		});
	}

	get online() {
		return this._online.get();
	}
	get color() {
		if (!this._online.get()) {
			return this._offlineColor.get();
		}
		return this._customColor.get() || this._onlineColor.get();
	}
	get fontColor() {
		if (!this._online.get()) {
			return this._offlineFontColor.get();
		}
		return this._customFontColor.get() || this._onlineFontColor.get();
	}
	get title() {
		return this._title.get();
	}
	get registrationForm() {
		return this._registrationForm.get();
	}
	get showSwitchDepartmentForm() {
		return this._showSwitchDepartmentForm.get();
	}
	get allowSwitchingDepartments() {
		return this._allowSwitchingDepartments.get();
	}
	get offlineMessage() {
		return this._offlineMessage.get();
	}
	get offlineUnavailableMessage() {
		return this._offlineUnavailableMessage.get();
	}
	get displayOfflineForm() {
		return this._displayOfflineForm.get();
	}
	get offlineSuccessMessage() {
		return this._offlineSuccessMessage.get();
	}
	get videoCall() {
		return this._videoCall.get();
	}
	get fileUpload() {
		return this._fileUpload.get();
	}
	get transcriptMessage() {
		return this._transcriptMessage.get();
	}
	get conversationFinishedMessage() {
		return this._conversationFinishedMessage.get();
	}
	get nameFieldRegistrationForm() {
		return this._nameFieldRegistrationForm.get();
	}
	get emailFieldRegistrationForm() {
		return this._emailFieldRegistrationForm.get();
	}
	get department() {
		return this._department.get();
	}
	get connecting() {
		return this._connecting.get();
	}
	get agent() {
		return this._agent.get();
	}
	get guestName() {
		return this._guestName.get();
	}
	get guestEmail() {
		return this._guestEmail.get();
	}
	get room() {
		return this._room.get();
	}
	get registrationFormMessage() {
		return this._registrationFormMessage.get();
	}

	set online(value) {
		this._online.set(value);
	}
	set title(value) {
		this._title.set(value);
	}
	set registrationForm(value) {
		this._registrationForm.set(value);
	}
	set showSwitchDepartmentForm(value) {
		this._showSwitchDepartmentForm.set(value);
	}
	set allowSwitchingDepartments(value) {
		this._allowSwitchingDepartments.set(value);
	}
	set offlineMessage(value) {
		this._offlineMessage.set(value);
	}
	set offlineUnavailableMessage(value) {
		this._offlineUnavailableMessage.set(value);
	}
	set displayOfflineForm(value) {
		this._displayOfflineForm.set(value);
	}
	set offlineSuccessMessage(value) {
		this._offlineSuccessMessage.set(value);
	}
	set customColor(value) {
		this._customColor.set(value);
	}
	set onlineColor(value) {
		this._onlineColor.set(value);
	}
	set offlineColor(value) {
		this._offlineColor.set(value);
	}
	set customFontColor(value) {
		this._customFontColor.set(value);
	}
	set onlineFontColor(value) {
		this._onlineFontColor.set(value);
	}
	set offlineFontColor(value) {
		this._offlineFontColor.set(value);
	}
	set videoCall(value) {
		this._videoCall.set(value);
	}
	set fileUpload(value) {
		this._fileUpload.set(value);
	}
	set transcriptMessage(value) {
		this._transcriptMessage.set(value);
	}
	set conversationFinishedMessage(value) {
		this._conversationFinishedMessage.set(value);
	}
	set nameFieldRegistrationForm(value) {
		this._nameFieldRegistrationForm.set(value);
	}
	set emailFieldRegistrationForm(value) {
		this._emailFieldRegistrationForm.set(value);
	}
	set connecting(value) {
		this._connecting.set(value);
	}
	set room(roomId) {
		this._room.set(roomId);
	}
	set department(departmentId) {
		const dept = Department.findOne({ _id: departmentId }) || Department.findOne({ name: departmentId });
		this._department.set(dept && dept._id);
	}
	set agent(agentData) {
		this._agent.set(agentData);
	}
	set guestName(name) {
		return this._guestName.set(name);
	}
	set guestEmail(email) {
		return this._guestEmail.set(email);
	}
	set registrationFormMessage(value) {
		this._registrationFormMessage.set(value);
	}

	ready() {
		this._ready.set(true);
	}

	isReady() {
		return this._ready.get();
	}

	setWidgetOpened() {
		return this._widgetOpened.set(true);
	}

	setWidgetClosed() {
		return this._widgetOpened.set(false);
	}

	isWidgetOpened() {
		return this._widgetOpened.get();
	}
})();
