class CreateChannelDialog extends Polymer.Element {
  static get is() { return 'create-channel-dlg'; }

  constructor() {
    super();
    this.LOCAL_NAME = "last-name-used";
    this.LOCAL_AVATAR = "last-avatar-used";
    this.LOCAL_PROVIDER = "last-provider-url";
  }

  show() {
    this.$.txtProvider.value = $service.dbService.getLocal(this.LOCAL_PROVIDER) || "https://channelelements.com/channel-elements.json";
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
        memberContract: memberContract,
        memberIdentity: {
          name: name,
          imageUrl: image
        }
      };

      $channels.registerWithSwitch(provider, $service.identityManager.signedKey, {}).then(() => {
        $channels.createChannel(provider, $service.identityManager.signedAddress, details).then((channelInfo) => {
          const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
          window.dispatchEvent(event);
          $channels.getSwitchInfo(provider).then((switchInfo) => {
            console.log("Channel created", switchInfo, channelInfo);
            $router.goto(['channel', switchInfo.id, channelInfo.channelAddress]);
          });
        });
      }).catch((err) => {
        console.error("Failed to create channel: ", err);
      });
    }
  }
}
window.customElements.define(CreateChannelDialog.is, CreateChannelDialog);