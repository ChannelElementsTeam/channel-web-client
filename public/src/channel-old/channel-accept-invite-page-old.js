class ChannelAcceptInvitationPage extends Polymer.Element {
  static get is() { return "channel-accept-invite-page"; }

  onCancel() {
    $router.goto("")
  }

  connectedCallback() {
    super.connectedCallback();
    Polymer.RenderStatus.beforeNextRender(this, () => {
      this.onInput();
    });
  }

  onInput() {
    const inviteUrl = this.$.txtUrl.value.trim();
    const name = this.$.txtName.value.trim();
    this.$.btnCreate.disabled = !(inviteUrl && name);
  }

  onAccept() {
    const inviteUrl = this.$.txtUrl.value.trim();
    const name = this.$.txtName.value.trim();
    if (inviteUrl &&  name) {
      $channels.acceptInvitation(inviteUrl, {}, {name: name}).then((channelInfo) => {
        const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
        window.dispatchEvent(event);
        $router.goto(['channel', channelInfo.channelUrl, channelInfo.registerUrl], channelInfo);
      }).catch((err) => {
        console.error("Failed to accept channel invitation: ", err);
      });

      // $channels.register(provider, {}).then((registry) => {
      //   $channels.createChannel(registry.services.registrationUrl, {
      //     channelDetails: { name: channel },
      //     participantDetails: { name: name }
      //   }).then((channelInfo) => {
      //     $router.goto(['channel', channelInfo.channelUrl, channelInfo.registerUrl], channelInfo);
      //   });
      // })
    }
  }
}
window.customElements.define(ChannelAcceptInvitationPage.is, ChannelAcceptInvitationPage);