class CreateChannelDialog extends Polymer.Element {
  static get is() { return 'create-channel-dlg'; }

  constructor() {
    super();
    this.LOCAL_NAME = "last-name-used";
    this.LOCAL_AVATAR = "last-avatar-used";
    this.LOCAL_PROVIDER = "last-provider-url";
    this.LOCAL_NUMBER = "identity-number";
  }

  show() {
    this.$.txtProvider.value = $service.dbService.getLocal(this.LOCAL_PROVIDER) || "https://channelelements.com/channel-elements.json";
    this.$.txtChannel.value = "";
    this.$.txtName.value = $service.dbService.getLocal(this.LOCAL_NAME) || "";
    this.$.txtImage.value = $service.dbService.getLocal(this.LOCAL_AVATAR) || "";
    this.$.chkSubscribe.checked = false;
    this.$.txtMobile.value = $service.dbService.getLocal(this.LOCAL_NUMBER) || "";
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

  onSubscribeChange() {
    this.$.mobilePanel.style.display = this.$.chkSubscribe.checked ? "" : "none";
  }

  onCreate() {
    this.hide();
    const provider = this.$.txtProvider.value.trim();
    const channel = this.$.txtChannel.value.trim();
    const name = this.$.txtName.value.trim();
    const image = this.$.txtImage.value.trim();
    const mobile = this.$.txtMobile.value.trim();
    if (provider && channel && name) {
      $service.dbService.setLocal(this.LOCAL_PROVIDER, provider);
      $service.dbService.setLocal(this.LOCAL_NAME, name);
      if (image) {
        $service.dbService.setLocal(this.LOCAL_AVATAR, image);
      }
      if (mobile) {
        $service.dbService.setLocal(this.LOCAL_NUMBER, mobile);
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
      const memberContract = { subscribe: this.$.chkSubscribe.checked };
      const details = {
        name: channel,
        channelContract: contract,
        memberContract: memberContract,
        memberIdentity: {
          name: name,
          imageUrl: image
        }
      };
      const regDetails = {};
      if (mobile) {
        regDetails.notifications = {
          smsNumber: mobile
        }
      }

      $channels.registerWithSwitch(provider, $service.identityManager.signedKey, regDetails, true).then(() => {
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