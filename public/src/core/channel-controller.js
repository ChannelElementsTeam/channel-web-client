class ChannelController extends Polymer.Element {
  static get is() { return "channel-controller" }
  static get properties() {
    return {
      channelInfo: {
        type: Object
      },
      joinData: {
        type: Object
      }
    };
  }

  constructor() {
    super();
    this._participantByAddress = {};
    this._participantByCode = {};
  }

  attach() {
    this._attached = true;
    this.onData();
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
      $channels.removeChannelListener('history-message', this.channelInfo.channelAddress, this._historyListener);
      this._historyListener = null;
    }
    if (this._mesageListener) {
      $channels.removeChannelListener('message', this.channelInfo.channelAddress, this._mesageListener);
      this._mesageListener = null;
    }
    if (this._participantListener) {
      $channels.removeChannelListener('participant', this.channelInfo.channelAddress, this._participantListener);
      this._participantListener = null;
    }
    if (this._deleteListener) {
      $channels.removeChannelListener('delete', this.channelInfo.channelAddress, this._deleteListener);
      this._deleteListener = null;
    }
    if (this._socketListener) {
      $channels.removeChannelListener('socket', this.channelInfo.channelAddress, this._socketListener);
      this._socketListener = null;
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
    };
    this._mesageListener = (message) => {
      if (this._attached) {
        this.handleMessage(message);
      }
    };
    this._participantListener = (joined, left) => {
      if (this._attached) {
        this.handleParticipant(joined, left);
      }
    };
    this._deleteListener = (notification) => {
      if (this._attached) {
        this.handleChannelDelete(notification);
      }
    };
    this._socketListener = (connected) => {
      if (this._attached) {
        this.handleSocketConnected(connected);
      }
    };

    $channels.addChannelListener("history-message", this.channelInfo.channelAddress, this._historyListener);
    $channels.addChannelListener("message", this.channelInfo.channelAddress, this._mesageListener);
    $channels.addChannelListener("participant", this.channelInfo.channelAddress, this._participantListener);
    $channels.addChannelListener("delete", this.channelInfo.channelAddress, this._deleteListener);
    $channels.addChannelListener("socket", this.channelInfo.channelAddress, this._socketListener);
  }

  handleHistoryMessage(details, message) {
    const channelMessage = this._parseChannelMessage(message.fullPayload);
    if (!channelMessage.valid) {
      console.warn("Ignoring history message: ", channelMessage.errorMessage, message);
      return;
    }
    const participantInfo = this._participantByAddress[details.senderAddress];
    const event = new CustomEvent('history-message', {
      bubbles: true, composed: true, detail: {
        message: message,
        channelMessage: channelMessage,
        participant: participantInfo
      }
    });
    this.dispatchEvent(event);
  }

  handleMessage(message) {
    const channelMessage = this._parseChannelMessage(message.fullPayload);
    if (!channelMessage.valid) {
      console.warn("Ignoring channel message: ", channelMessage.errorMessage, message);
      return;
    }
    const participantInfo = this._participantByCode[message.senderCode];
    const event = new CustomEvent('message', {
      bubbles: true, composed: true, detail: {
        message: message,
        channelMessage: channelMessage,
        participant: participantInfo
      }
    });
    this.dispatchEvent(event);
  }

  handleParticipant(joined, left) {
    if (joined) {
      const data = {
        identity: joined.memberIdentity,
        code: joined.participantCode
      };
      const details = ChannelIdentityUtils.decode(data.identity.signature, data.identity.publicKey);
      data.identity.details = details;
      this._participantByCode[joined.participantCode] = data;
      if (!this._participantByAddress[details.address]) {
        this._participantByAddress[details.address] = data;
      }
      console.log("Participant joined", data);
      const event = new CustomEvent('participant-joined', { bubbles: true, composed: true, detail: { participant: data } });
      this.dispatchEvent(event);
    } else {
      const data = this._participantByAddress[left.participantAddress] || this._participantByCode[left.participantCode];
      if (this._participantByCode[left.participantCode]) {
        delete this._participantByCode[left.participantCode];
      }
      if (left.permanently) {
        delete this._participantByAddress[left.participantAddress];
      }
      console.log("Participant left", data);
      const event = new CustomEvent('participant-left', { bubbles: true, composed: true, detail: { participant: data, permanently: left.permanently } });
      this.dispatchEvent(event);
    }
  }

  handleChannelDelete(notification) {
    if (this.channelInfo) {
      const chid = notification.channelAddress;
      if (chid === this.channelInfo.channelAddress) {
        const event = new CustomEvent('delete', { bubbles: true, composed: true, detail: notification });
        this.dispatchEvent(event);
      }
    }
    const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
    window.dispatchEvent(event);
  }

  handleSocketConnected(connected) {
    const event = new CustomEvent('socket', {
      bubbles: true, composed: true, detail: { connected: connected }
    });
    this.dispatchEvent(event);
  }

  _parseChannelMessage(payload) {
    const deserializedCardExchangeMessage = { valid: false };
    const view = new DataView(payload.buffer, payload.byteOffset);
    const jsonLength = view.getUint32(0);
    try {
      const jsonString = new TextDecoder("utf-8").decode(payload.subarray(4, 4 + jsonLength));
      deserializedCardExchangeMessage.json = JSON.parse(jsonString);
      if (payload.byteLength > (4 + jsonLength)) {
        deserializedCardExchangeMessage.binary = new Uint8Array(payload, payload.byteOffset + 4 + jsonLength, payload.byteLength - 4 - jsonLength);
      }
      deserializedCardExchangeMessage.valid = true;
    } catch (err) {
      deserializedCardExchangeMessage.valid = false;
      deserializedCardExchangeMessage.errorMessage = err.message || "Invalid payload";
    }
    return deserializedCardExchangeMessage;
  }

  // ChannelInfo interface methods

  get participants() {
    var list = [];
    for (var key in this._participantByAddress) {
      if (this._participantByAddress.hasOwnProperty(key)) {
        list.push(this._participantByAddress[key]);
      }
    }
    return [];
  }

  get me() {
    for (var key in this._participantByCode) {
      if (this._participantByCode.hasOwnProperty(key)) {
        let p = this._participantByCode[key];
        if (p.isYou || p.isMe) {
          if (!p.identity) {
            p.identity = p.participantIdentity.signedIdentity;
          }
          return p;
        }
      }
    }
  }

  onData() {
    this._participantByAddress = {};
    this._participantByCode = {};
    if (this.channelInfo && this.joinData) {
      for (var i = 0; i < this.channelInfo.members.length; i++) {
        let p = this.channelInfo.members[i];
        const details = ChannelIdentityUtils.decode(p.identity.signature, p.identity.publicKey);
        p.identity.details = details;
        this._participantByAddress[details.address] = p;
      }
      for (var i = 0; i < this.joinData.participants.length; i++) {
        let p = this.joinData.participants[i];
        if (!p.identity) {
          p.identity = p.participantIdentity.signedIdentity;
        }
        p.identity.details = ChannelIdentityUtils.decode(p.identity.signature, p.identity.publicKey);
        this._participantByCode[p.code] = p;
      }
    }
  }

  sendCard(sender, messageData, history = true, priority = false) {
    return new Promise((resolve, reject) => {
      if (!this.joinData) {
        console.warn("Ignoring new card message. Channel not joined.");
        reject(new Error("Ignoring new card message. Channel not joined."));
      } else {
        const message = CardUtils.addCardMessage(this.joinData.channelCode, this.joinData.participantCode, sender.packageSource, messageData, history, priority);
        $channels.sendMessage(this.channelInfo.channelAddress, message).then((sentMessage) => {
          resolve(sentMessage);
          const event = new CustomEvent('message', {
            bubbles: true, composed: true, detail: {
              message: message,
              channelMessage: {
                valid: true,
                json: message.jsonMessage,
                binary: message.binaryPayload
              },
              participant: this.me
            }
          });
          this.dispatchEvent(event);
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
        $channels.sendMessage(this.channelInfo.channelAddress, message).then((sentMessage) => {
          resolve(sentMessage);
        }).catch((err) => {
          console.error("Failed to send message: ", err);
          reject(err);
        });
      }
    });
  }
}

window.customElements.define(ChannelController.is, ChannelController);