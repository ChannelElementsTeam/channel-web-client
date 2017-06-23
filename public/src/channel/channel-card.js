class ChannelCard extends Polymer.Element {
  static get is() { return 'channel-card'; }
  static get properties() {
    return {
      data: Object,
      channel: Object
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.refresh();
  }

  refresh() {
    if (this.data && this.channel) {
      this.clearElement(this.$.cardContainer);
      var e = document.createElement(this.data.package.channelComponent.viewerTag);
      e.cardId = this.data.channelMessage.json.details.cardId;
      e.packageSource = this.data.channelMessage.json.details.package;
      e.mode = "view";
      e.channel = this.channel;
      e.data = this.data.channelMessage.json.details.data;
      e.binary = this.data.channelMessage.binary;
      this.$.cardContainer.appendChild(e);
      this.element = e;
      console.log("data", this.data);
    }
  }

  clearElement(node) {
    this.element = null;
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  }

  handleCardToCardMessage(detail) {
    if (this.element && this.element.handleCardToCardMessageReceived) {
      this.element.handleCardToCardMessageReceived(detail.participant, this.channelMessage.json.details);
    }
  }
}
window.customElements.define(ChannelCard.is, ChannelCard);