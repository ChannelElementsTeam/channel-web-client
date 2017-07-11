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

  refreshChannels() {
    $channels.listAllChannels($service.identityManager.signedAddress).then((list) => {
      this.set("channels", list);
      console.log("channels: ", list);
    });
  }
}
window.customElements.define(FeedPage.is, FeedPage);