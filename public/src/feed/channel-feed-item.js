class ChannelFeedItem extends Polymer.Element {
  static get is() { return "channel-feed-item" };
  static get properties() {
    return {
      channel: Object
    };
  }
}
window.customElements.define(ChannelFeedItem.is, ChannelFeedItem);