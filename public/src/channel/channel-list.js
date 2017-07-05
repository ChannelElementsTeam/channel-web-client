class ChannelList extends Polymer.Element {
  static get is() { return "channel-list" };

  static get properties() {
    return {
      list: Array
    };
  }

  connectedCallback() {
    super.connectedCallback();
    Polymer.RenderStatus.beforeNextRender(this, () => {
      this.refresh();
    });
    window.addEventListener('refresh-channels', () => {
      this.refresh();
    });
  }

  refresh() {
    $channels.listAllChannels($service.identityManager.signedAddress).then((list) => {
      this.set("list", list);
    });
  }

  onItemClick(event) {
    const data = event.model.item;
    $router.goto(['channel', data.providerId, data.channelAddress]);
  }
}
window.customElements.define(ChannelList.is, ChannelList);