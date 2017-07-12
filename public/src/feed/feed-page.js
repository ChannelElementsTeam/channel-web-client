class FeedPage extends Polymer.Element {
  static get is() { return 'feed-page' }
  static get properties() {
    return {
      channels: Array
    }
  }

  onActivate() {
    this.refreshChannels();
  }

  onDeactivate() {
    this.set("channels", []);
  }

  refreshChannels() {
    $channels.listAllChannels($service.identityManager.signedAddress).then((list) => {
      this.set("channels", list);
      console.log("channels: ", list);
    });
  }

  onItemClick(event) {
    const data = event.model.item;
    $router.goto(['channel', data.providerId, data.channelAddress]);
  }
}
window.customElements.define(FeedPage.is, FeedPage);