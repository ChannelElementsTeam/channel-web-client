class ChannelController extends Polymer.Element {
  static get is() { return "channel-controller" }
  static get Properties() {
    return {
      channelInfo: {
        type: Object,
        observer: 'onData'
      },
      joinData: {
        type: Object,
        observer: 'onData'
      }
    };
  }

  constructor() {
    super();
    this.participantById = {};
    this.participantByCode = {};
  }

  attach() {
    this._attached = true;
    this._attachListeners();
  }

  detach() {
    this._attached = false;
    this._removeListeners();
  }

  _removeListeners() {
    if (!this.channelInfo) {
      return;
    }
    if (this._historyListener) {
      $channels.removeChannelListener('history-message', this.channelInfo.channelId, this._historyListener);
      this._historyListener = null;
    }
    if (this._mesageListener) {
      $channels.removeChannelListener('message', this.channelInfo.channelId, this._mesageListener);
      this._mesageListener = null;
    }
    if (this._participantListener) {
      $channels.removeChannelListener('participant', this.channelInfo.channelId, this._participantListener);
      this._participantListener = null;
    }
    if (this._deleteListener) {
      $channels.removeChannelListener('delete', this.channelInfo.channelId, this._deleteListener);
      this._deleteListener = null;
    }
  }

  _attachListeners() {
    if (!this.channelInfo) {
      return;
    }

    this._removeListeners();

    this._historyListener = (details, message) => {
      if (this._attached) {
        this.handleHistoryMessage(details, message);
      }
    }
    this._mesageListener = (message) => {
      if (this._attached) {
        this.handleMessage(message);
      }
    }
    this._participantListener = (joined, left) => {
      if (this._attached) {
        this.handleParticipant(joined, left);
      }
    }
    this._deleteListener = (notification) => {
      if (this._attached) {
        this.handleChannelDelete(notification);
      }
    }

    $channels.addChannelListener("history-message", this.channelInfo.channelId, this._historyListener);
    $channels.addChannelListener("message", this.channelInfo.channelId, this._mesageListener);
    $channels.addChannelListener("participant", this.channelInfo.channelId, this._participantListener);
    $channels.addChannelListener("delete", this.channelInfo.channelId, this._deleteListener);
  }

  handleHistoryMessage(details, message) {
    console.log("History message", details, message);
    // TODO: 
  }

  handleMessage(message) {
    console.log("message", message);
    // TOOD: 
  }

  handleParticipant(joined, left) {
    console.log("participant", joined || left);
    // TODO: 
  }

  handleChannelDelete(notification) {
    console.log("Deleted", notification);
    // TODO: 
  }

  // this.deleteChannelCallback = (notification) => {
  //     const chid = notification.channelId;
  //     if (this.channelInfo) {
  //       if (chid === this.channelInfo.channelId) {
  //         $router.goto("");
  //       }
  //     }
  //     const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
  //     window.dispatchEvent(event);
  //   };

  // handleHistoryMessage(details, message) {
  //   if (message && details) {
  //     const p = this.participantById[details.participantId];
  //     if (p) {
  //       // TODO: add message
  //       // this.unshift('items', {
  //       //   message: message,
  //       //   participant: p
  //       // });
  //     }
  //   }
  // }
  // handleParticipant(joined, left) {
  //   if (joined) {
  //     var data = {
  //       participantId: joined.participantId,
  //       code: joined.participantCode,
  //       details: joined.participantDetails
  //     }
  //     this.participantByCode[joined.participantCode] = data;
  //     if (!this.participantById[joined.participantId]) {
  //       this.participantById[joined.participantId] = data;
  //     }
  //   } else {
  //     if (this.participantByCode[left.participantCode]) {
  //       delete this.participantByCode[left.participantCode];
  //     }
  //     if (left.permanently) {
  //       delete this.participantById[left.participantId];
  //     }
  //   }
  // }

  // ChannelInfo interface methods

  get participants() {
    // TODO:
    return [];
  }

  onData() {
    this.participantById = {};
    this.participantByCode = {};
    if (this.channelInfo && this.joinData) {
      for (var i = 0; i < this.channelInfo.recentlyActiveMembers.length; i++) {
        let p = this.channelInfo.recentlyActiveMembers[i];
        this.participantById[p.participantId] = p;
      }
      for (var i = 0; i < this.joinData.participants.length; i++) {
        let p = this.joinData.participants[i];
        this.participantByCode[p.code] = p;
      }
    }
  }

  sendCard(sender, messageData, history = true, priority = false) {
    return new Promise((resolve, reject) => {
      if (!this.joinData) {
        console.warn("Ignoring new card message. Channel not joined.");
        reject(new Error("Ignoring new card message. Channel not joined."));
      } else {
        const message = CardUtils.addCardMessage(this.joinData.channelCode, this.joinData.participantCode, sender.packageName, messageData, history, priority);
        $channels.sendMessage(this.channelInfo.channelId, message).then(() => {
          resolve();

          // TODO: handle message
          const event = new CustomEvent('message', { bubbles: true, composed: true, detail: message });
          try {
            this.dispatchEvent(event);
          } catch (ex) {
            console.error("Exception in message event handler:", event);
          }
        }).catch((err) => {
          console.error("Failed to send message: ", err);
          reject(err);
        });
      }
    });
  }

  sendCardToCardMessage(sender, messageData, history = true, priority = false) {
    return new Promise((resolve, reject) => {
      if (!this.joinData) {
        console.warn("Ignoring card message. Channel not joined.");
        reject(new Error("Ignoring card message. Channel not joined."));
      } else {
        const message = CardUtils.cardToCardMessage(this.joinData.channelCode, this.joinData.participantCode, sender.cardId, messageData, history, priority);
        $channels.sendMessage(this.channelInfo.channelId, message).then(() => {
          resolve();
        }).catch((err) => {
          console.error("Failed to send message: ", err);
          reject(err);
        });
      }
    });
  }
}

window.customElements.define(ChannelController.is, ChannelController);