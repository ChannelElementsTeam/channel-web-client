class ChannelCard extends Polymer.Element {
  static get is() { return 'channel-card'; }
  static get properties() {
    return {
      data: {
        type: Object,
        observer: 'refresh'
      },
      pending: {
        type: Array,
        notify: false,
      },
      participant: Object,
      channel: Object,
      userClass: {
        type: String,
        value: "pinnable"
      },
      pinIcon: {
        type: String,
        value: "chnls:vertical-align-top"
      },
      pinnable: {
        type: Boolean,
        value: true,
        observer: 'pinnableChanged'
      },
      pinned: {
        type: Boolean,
        value: false,
        observer: 'pinnedChange'
      },
      pinOnLoad: {
        type: Boolean,
        value: false
      },
      pinTitle: String
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

      this.set("participant", this.data.participant.details);
      console.log("Card participant", this.data);

      requestAnimationFrame(() => {
        if (this.pending && this.pending.length) {
          this.pending.sort((a, b) => {
            return a.message.timestamp = b.message.timestamp;
          });
          for (var i = 0; i < this.pending.length; i++) {
            this.handleCardToCardMessage(this.pending[i]);
          }
        }
        this.set("pending", []);

        if (this.pinOnLoad !== this.pinned) {
          this.togglePin();
        }

        const event = new CustomEvent("render", { bubbles: false, composed: true });
        this.dispatchEvent(event);
      });
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
      this.element.handleCardToCardMessageReceived(detail.participant, detail.channelMessage, detail.message);
    }
  }

  pinnableChanged() {
    const style = this.pinnable ? (this.pinned ? "pinnable pinned" : "pinnable") : "";
    this.set("userClass", style);
  }

  pinnedChange() {
    this.set("pinTitle", this.pinned ? "Unpin" : "Pin to the top");
    this.set("pinIcon", this.pinned ? "chnls:vertical-align-bottom" : "chnls:vertical-align-top")
    this.pinnableChanged();
  }

  togglePin() {
    const event = new CustomEvent("pin", { bubbles: false, composed: true, detail: { pin: !this.pinned, data: this.data } });
    this.dispatchEvent(event);
  }
}
window.customElements.define(ChannelCard.is, ChannelCard);