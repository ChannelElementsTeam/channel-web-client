class CreateChannelDialog extends Polymer.Element {
  static get is() { return 'create-channel-dlg'; }

  constructor() {
    super();
    this.LOCAL_NAME = "last-name-used";
    this.LOCAL_AVATAR = "last-avatar-used";
    this.LOCAL_PROVIDER = "last-provider-url";
  }

  show() {
    this.$.txtProvider.value = $service.dbService.getLocal(this.LOCAL_PROVIDER) || "";
    this.$.txtChannel.value = "";
    this.$.txtName.value = $service.dbService.getLocal(this.LOCAL_NAME) || "";
    this.$.txtImage.value = $service.dbService.getLocal(this.LOCAL_AVATAR) || "";
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
    const image = this.$.txtImage.value.trim();
    if (provider && channel && name) {
      $service.dbService.setLocal(this.LOCAL_PROVIDER, provider);
      $service.dbService.setLocal(this.LOCAL_NAME, name);
      if (image) {
        $service.dbService.setLocal(this.LOCAL_AVATAR, image);
      }
      const identity = $service.identityManager.getSignedIdentity(name, image);
      const contract = {
        package: "https://github.com/ChannelsTeam/contract-standard",
        serviceContract: {
          options: {
            history: true,
            topology: 'many-to-many'
          },
          extensions: {}
        },
        participationContract: {
          type: "https://channelelements.com/contracts/participation/standard",
          extensions: {}
        }
      };
      const memberContract = { subscribe: true };
      const details = {
        name: channel,
        channelContract: contract,
        memberContract: memberContract
      };
      $channels.createChannel(provider, identity, details).then((channelInfo) => {
        const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
        window.dispatchEvent(event);
        console.log("Channel created", channelInfo);
      }).catch((err) => {
        console.error("Failed to create channel: ", err);
      });

      // $channels.register(provider, {}).then((registry) => {
      //   $channels.createChannel(registry.services.registrationUrl, {
      //     channelDetails: { name: channel },
      //     participantDetails: { name: name }
      //   }).then((channelInfo) => {
      //     const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
      //     window.dispatchEvent(event);
      //     $router.goto(['channel', channelInfo.channelUrl, channelInfo.registerUrl], channelInfo);
      //   });
      // })
    }
  }
}
window.customElements.define(CreateChannelDialog.is, CreateChannelDialog);