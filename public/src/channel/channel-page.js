class ChannelPage extends Polymer.Element {
  static get is() { return 'channel-page'; }
  static get properties() {
    return {
      items: {
        type: Array,
        value: function () { return []; }
      },
      channelInfo: {
        type: Object,
        observer: 'refreshChannel'
      }
    };
  }

  constructor() {
    super();
    this.participantById = {};
    this.participantByCode = {};
  }

  onActivate(route) {
    this.onDeactivate();
    this._active = true;
    this.channelUrl = route.segments[1];
    this.registryUrl = route.segments[2];
    this.refresh(route.context);
  }

  onDeactivate() {
    this._active = false;
    this.removeCallbacks();
    if (this.joinData) {
      $channels.leaveChannel({ channelId: this.joinData.channelId }).then(() => { });
      this.joinData = null;
    }
  }

  refresh(info) {
    if (info) {
      this.set("channelInfo", info);
    } else {
      $channels.getChannel(this.registryUrl, this.channelUrl).then((response) => {
        this.set("channelInfo", response);
      });
    }
  }

  removeCallbacks() {
    if (this.historyCallback) {
      $channels.removeHistoryMessageListener(this.channelInfo.channelId, this.historyCallback);
      this.historyCallback = null;
    }
    if (this.messageCallback) {
      $channels.removeChannelMessageListener(this.channelInfo.channelId, this.messageCallback);
      this.messageCallback = null;
    }
    if (this.participantCallback) {
      $channels.removeChannelParticipantListener(this.channelInfo.channelId, this.participantCallback);
      this.participantCallback = null;
    }
    if (this.deleteChannelCallback) {
      $channels.removeChannelDeletedListener(this.deleteChannelCallback);
      this.deleteChannelCallback = null;
    }
  }

  refreshChannel() {
    if (!this.channelInfo) {
      return;
    }
    this.$.composeGlass.style.opacity = 1;
    this.$.composeGlass.style.display = "";

    // update the app toolbar
    const barActions = [{
      icon: "chnls:share",
      name: "Share channel",
      callback: () => {
        this.shareChannel();
      }
    }];
    if (this.channelInfo.isCreator) {
      barActions.push({
        icon: "chnls:delete",
        name: "Delete channel",
        callback: () => {
          this.deleteChannel();
        }
      });
    }
    $app.setBarData({
      title: this.channelInfo.details.name,
      actions: barActions
    });

    this.removeCallbacks();
    $channels.connectTransport(this.channelInfo.registerUrl, this.channelInfo.channelId, this.channelInfo.transportUrl).then(() => {
      $channels.joinChannel({ channelId: this.channelInfo.channelId }).then((joinResponse) => {
        this.joinData = joinResponse;
        this.$.composeGlass.style.opacity = 0;
        setTimeout(() => {
          this.$.composeGlass.style.display = "none";
        }, 300);
        this.refreshContent();
      }).catch((err) => {
        console.error(err);
      });
    });
  }

  refreshContent() {
    if (!this.channelInfo) {
      return;
    }

    this.set("items", []);

    // refresh particpant maps
    this.participantById = {};
    this.participantByCode = {};
    for (var i = 0; i < this.channelInfo.recentlyActiveMembers.length; i++) {
      let p = this.channelInfo.recentlyActiveMembers[i];
      this.participantById[p.participantId] = p;
    }
    for (var i = 0; i < this.joinData.participants.length; i++) {
      let p = this.joinData.participants[i];
      this.participantByCode[p.code] = p;
    }

    // re-add message handlers
    this.removeCallbacks();
    this.historyCallback = (details, message) => {
      this.handleHistoryMessage(details, message);
    };
    this.messageCallback = (message) => {
      this.handleChannelMessage(message);
    };
    this.participantCallback = (joined, left) => {
      this.handleParticipant(joined, left);
    };
    this.deleteChannelCallback = (notification) => {
      const chid = notification.channelId;
      if (this.channelInfo) {
        if (chid === this.channelInfo.channelId) {
          $router.goto("");
        }
      }
      const event = new CustomEvent('refresh-channels', { bubbles: true, composed: true, detail: {} });
      window.dispatchEvent(event);
    };
    $channels.addChannelMessageListener(this.channelInfo.channelId, this.messageCallback);
    $channels.addHistoryMessageListener(this.channelInfo.channelId, this.historyCallback);
    $channels.addChannelParticipantListener(this.channelInfo.channelId, this.participantCallback);
    $channels.addChannelDeletedListener(this.deleteChannelCallback);

    // load history
    $channels.getHistory({
      channelId: this.channelInfo.channelId,
      before: (new Date()).getTime(),
      maxCount: 100
    }).then((response) => {
      // console.log("Histroy received", response)
    });
  }

  onCompose(event) {
    const detail = event.detail;
    const payload = $channels.encode(detail.message);
    $channels.sendMessage(this.channelInfo.channelId, null, payload, detail.history, detail.priority).then((messageInfo) => {
      this.push('items', {
        message: messageInfo,
        participant: this.participantByCode[this.joinData.participantCode]
      });
      this.scrollToBottom();
    });
    this.$.compose.clear();
  }

  shareChannel() {
    const shareRequest = {
      channelId: this.channelInfo.channelId,
      details: {}
    };
    $channels.shareChannel(this.channelInfo.registerUrl, shareRequest).then((shareResponse) => {
      this.$.txtCode.value = shareResponse.shareCodeUrl;
      this.$.sharePanel.style.display = "";
      setTimeout(() => {
        this.$.txtCode.select();
      }, 50);
    });
  }

  hideSharePanel() {
    this.$.sharePanel.style.display = "none";
  }

  deleteChannel() {
    $channels.deleteChannel(this.channelInfo.registerUrl, this.channelInfo.channelUrl).then(() => { });
  }

  handleChannelMessage(message) {
    this.push('items', {
      message: message,
      participant: this.participantByCode[message.senderCode]
    });
    this.scrollToBottom();
  }

  handleHistoryMessage(details, message) {
    if (message && details) {
      const p = this.participantById[details.participantId];
      if (p) {
        this.unshift('items', {
          message: message,
          participant: p
        });
      }
      this.scrollToBottom();
    }
  }

  handleParticipant(joined, left) {
    if (joined) {
      var data = {
        participantId: joined.participantId,
        code: joined.participantCode,
        details: joined.participantDetails
      }
      this.participantByCode[joined.participantCode] = data;
      if (!this.participantById[joined.participantId]) {
        this.participantById[joined.participantId] = data;
      }
    } else {
      if (this.participantByCode[left.participantCode]) {
        delete this.participantByCode[left.participantCode];
      }
      if (left.permanently) {
        delete this.participantById[left.participantId];
      }
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.$.scrollPanel.scrollTop = this.$.scrollPanel.scrollHeight;
    }, 100);
    this.$.scrollPanel.scrollTop = this.$.scrollPanel.scrollHeight;
  }
}

window.customElements.define(ChannelPage.is, ChannelPage);