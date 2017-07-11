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
      }
    };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.$.controller.delegate.detach();
    if (this.joinData) {
      $channels.leaveChannel({ channelAddress: this.joinData.channelAddress }).then(() => { });
      this.joinData = null;
    }
  }

  refresh() {
    this.$.controller.delegate.detach();
    if (this.channel) {
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

    $channels.getHistory({
      channelAddress: this.channel.channelAddress,
      before: (new Date()).getTime(),
      maxCount: 10
    }).then((response) => {
      console.log("History: ", response);
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
          console.log("Add card", detail);
          break;
        }
      }
    }
  }
}
window.customElements.define(ChannelFeedItem.is, ChannelFeedItem);