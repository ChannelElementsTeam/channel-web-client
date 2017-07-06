class ChannelCard extends Polymer.Element {
  static get is() { return 'channel-card'; }
  static get properties() {
    return {
      data: {
        type: Object,
        observer: 'refresh'
      },
      participant: Object,
      channel: Object
    }
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


      const identity = this.data.participant.identity || this.data.participant.participantIdentity.signedIdentity;
      let _participant = this.data._participant || identity.details;
      if (!_participant) {
        _participant = ChannelIdentityUtils.decode(identity.signature, identity.publicKey);
      }
      this.set("participant", _participant);

      if (!_participant) {
        console.log("*", this.data);
        console.log("***");
      }
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
      this.element.handleCardToCardMessageReceived(detail.participant, detail.channelMessage);
    }
  }
}
window.customElements.define(ChannelCard.is, ChannelCard);