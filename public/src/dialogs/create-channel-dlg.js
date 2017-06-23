class CreateChannelDialog extends Polymer.Element {
  static get is() { return 'create-channel-dlg'; }
  show() {
    this.$.txtProvider.value = $service.dbService.getLocal("last-provider-url") || "";
    this.$.txtChannel.value = "";
    this.$.txtName.value = $service.dbService.getLocal("last-name-used") || "";
    this.onInput();
    this.$.dlg.show();
  }
  hide() {
    this.$.dlg.hide();
  }
  onCancel() {
    this.hide();
  }
  onInput() {
    const provider = this.$.txtProvider.value.trim();
    const channel = this.$.txtChannel.value.trim();
    const name = this.$.txtName.value.trim();
    this.$.btnCreate.disabled = !(provider && channel && name);
  }
  onCreate() {
    this.hide();
    const provider = this.$.txtProvider.value.trim();
    const channel = this.$.txtChannel.value.trim();
    const name = this.$.txtName.value.trim();
    if (provider && channel && name) {
      $service.dbService.setLocal("last-provider-url", provider);
      $service.dbService.setLocal("last-name-used", name);
      $channels.register(provider, {}).then((registry) => {
        $channels.createChannel(registry.services.registrationUrl, {
          channelDetails: { name: channel },
          participantDetails: { name: name }
        }).then((channelInfo) => {
          const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
          window.dispatchEvent(event);
          $router.goto(['channel', channelInfo.channelUrl, channelInfo.registerUrl], channelInfo);
        });
      })
    }
  }
}
window.customElements.define(CreateChannelDialog.is, CreateChannelDialog);