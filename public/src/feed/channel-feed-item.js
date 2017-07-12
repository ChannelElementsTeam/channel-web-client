class ChannelFeedItem extends Polymer.Element {
  static get is() { return "channel-feed-item" };
  static get properties() {
    return {
      channel: {
        type: Object,
        observer: 'refresh'
      },
      joinData: {
        type: Object,
        observer: 'onChannelJoined'
      },
      itemData: Object
    };
  }

  constructor() {
    super();
    this._pendingCardMessages = {};
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.$.controller.delegate.detach();
    this._pendingCardMessages = {};
    if (this.joinData) {
      $channels.leaveChannel({ channelAddress: this.joinData.channelAddress }).then(() => { });
      this.joinData = null;
    }
  }

  refresh() {
    this.$.controller.delegate.detach();
    if (this.channel) {
      this.set("channel.timeDisplay", this.friendlyTime(this.channel.lastUpdated));
      $channels.connectTransport(this.channel.providerId, this.channel.channelAddress, this.channel.transportUrl).then(() => {
        const joinRequest = {
          channelAddress: this.channel.channelAddress,
          memberIdentity: $service.identityManager.signedAddress
        };
        $channels.joinChannel(joinRequest).then((joinResponse) => {
          this.set("joinData", joinResponse);
        });
      }).catch((err) => {
        console.error(err);
      });
    }
  }

  friendlyTime(time) {
    return moment(time).calendar(null, {
      sameDay: 'h:mm a',
      nextDay: '[Tomorrow]',
      nextWeek: 'dddd',
      lastWeek: '[Last] dddd',
      sameElse: 'M/D/YYYY'
    });
  }

  onChannelJoined() {
    if (!this.channel) {
      return;
    }
    if (!this.joinData) {
      return;
    }

    // Attach controller
    this.$.controller.delegate.channelInfo = this.channel;
    this.$.controller.delegate.joinData = this.joinData;
    this.$.controller.delegate.attach();

    this._pendingCardMessages = {};
    $channels.getHistory({
      channelAddress: this.channel.channelAddress,
      before: (new Date()).getTime(),
      maxCount: 10
    }).then((response) => {
      // console.log("History: ", response);
    });
  }

  onHistoryMessage(event) {
    var detail = event.detail;
    if (detail) {
      this.processMessage(detail);
    }
  }

  onMessage(event) {
    var detail = event.detail;
    if (detail) {
      this.processMessage(detail);
    }
  }

  processMessage(detail) {
    const channelMessage = detail.channelMessage;
    if (channelMessage.valid) {
      const msg = channelMessage.json;
      const msgDetails = msg.details;
      switch (msg.type) {
        case 'add-card': {
          this._replaceCardIfNeeded(detail);
          break;
        }
        case 'card-to-card':
          if (this.currentCardId && this.currentCardId === msgDetails.cardId) {
            this.$.card.handleCardToCardMessage(detail);
            if (detail.message.history) {
              this._fireUpdated(detail.message.timestamp);
            }
          } else {
            if (!this._pendingCardMessages[msgDetails.cardId]) {
              this._pendingCardMessages[msgDetails.cardId] = [];
            }
            this._pendingCardMessages[msgDetails.cardId].push(detail);
          }
          break;
        default:
          break;
      }
    }
  }

  _replaceCardIfNeeded(detail) {
    let replace = (!this.currentCard) || (detail.message.timestamp >= this.currentCard.message.timestamp);
    if (replace) {
      this.currentCard = detail;
      const msgDetails = detail.channelMessage.json.details;
      const cardId = msgDetails.cardId;
      this.currentCardId = cardId;
      $service.componentManager.get(msgDetails.package).then((pkg) => {
        Polymer.importHref(this.resolveUrl(pkg.importHref), () => {
          detail.package = pkg;
          const itemData = {
            cardId: cardId,
            detail: detail,
            channel: this.$.controller.delegate
          }
          if (this._pendingCardMessages[cardId]) {
            itemData.pendingCardMessages = this._pendingCardMessages[cardId];
            delete this._pendingCardMessages[cardId];
          }
          this.set("itemData", itemData);
          this._fireUpdated(detail.message.timestamp);
        });
      }).catch((err) => {
        console.error("Failed to import component", err);
      });
    }
  }

  _fireUpdated(timestamp) {
    const event = new CustomEvent("update", { bubbles: true, composed: true, detail: { timestamp: timestamp } });
    this.dispatchEvent(event);
  }
}
window.customElements.define(ChannelFeedItem.is, ChannelFeedItem);