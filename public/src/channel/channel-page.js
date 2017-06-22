class ChannelPage extends Polymer.Element {
  static get is() { return 'channel-page'; }

  static get properties() {
    return {
      channelInfo: {
        type: Object,
        observer: 'refreshChannel'
      }
    }
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
    this.setBottomDrawer(false);
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

  // Load/Refresh content

  refresh(info) {
    if (info) {
      this.set("channelInfo", info);
    } else {
      $channels.getChannel(this.registryUrl, this.channelUrl).then((response) => {
        this.set("channelInfo", response);
      });
    }
  }

  refreshChannel() {
    if (!this.channelInfo) {
      return;
    }
    this.enableComposeArea(false);

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

    // remove handlers so we dont act on any events
    // while we are trying to connect to a new channel
    this.removeCallbacks();
    // connect socket and join channel
    console.log("Connecting to socket for channel: ", this.channelInfo.channelId);
    $channels.connectTransport(this.channelInfo.registerUrl, this.channelInfo.channelId, this.channelInfo.transportUrl).then(() => {
      $channels.joinChannel({ channelId: this.channelInfo.channelId }).then((joinResponse) => {
        console.log("Joined channel: ", this.channelInfo.channelId);
        this.joinData = joinResponse;
        this.enableComposeArea(true);
        this.onChannelJoined();
      });
    }).catch((err) => {
      console.error(err);
    });
  }

  onChannelJoined() {
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
    console.log("Fetching history");
    $channels.getHistory({
      channelId: this.channelInfo.channelId,
      before: (new Date()).getTime(),
      maxCount: 100
    }).then((response) => {
      console.log("Histroy: ", response);
    });
  }

  handleHistoryMessage(details, message) {
    if (message && details) {
      const p = this.participantById[details.participantId];
      if (p) {
        // TODO: add message
        // this.unshift('items', {
        //   message: message,
        //   participant: p
        // });
      }
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

  // Compose area support methods

  onComponents() {
    Polymer.importHref(this.resolveUrl("../components/component-picker.html"), () => {
      this.setBottomDrawer(true);
    });
  }

  onCancelDrawer() {
    this.setBottomDrawer(false);
  }

  setBottomDrawer(open) {
    if (open) {
      this.$.picker.refresh();
      this.$.bottomDrawer.style.display = "";
      this.$.glassPane.style.display = "";
      setTimeout(() => {
        this.$.bottomDrawer.style.transform = "none";
        this.$.glassPane.style.background = "rgba(0, 0, 0, 0.2)";
      }, 100);
    } else {
      this.$.bottomDrawer.style.transform = "translateY(110%)";
      this.$.glassPane.style.background = "rgba(0, 0, 0, 0)";
      setTimeout(() => {
        this.$.bottomDrawer.style.display = "none";
        this.$.glassPane.style.display = "none";
      }, 500);
    }
  }

  onComposerSelected(event) {
    this.setBottomDrawer(false);
    var pkg = event.detail;
    if (pkg && pkg.importHref) {
      Polymer.importHref(this.resolveUrl(pkg.importHref), () => {
        this.switchToComposer(pkg);
      });
    }
  }

  clearElement(node) {
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  }

  switchToComposer(pkg) {
    console.log("switched", pkg);
    this.clearElement(this.$.composerPanel);
    var e = document.createElement(pkg.channelComponent.composerTag);
    this.$.composerPanel.appendChild(e);
    this.$.noComposer.style.display = "none";
    this.$.composerPanel.style.display = "";
  }

  enableComposeArea(enabled) {
    if (enabled) {
      this.$.composeArea.style.opacity = 1;
      this.$.composeArea.style.pointerEvents = "auto";
    } else {
      this.$.composeArea.style.opacity = 0;
      this.$.composeArea.style.pointerEvents = "none";
    }
  }

  // ChannelInfo interface methods

  get participants() {
    // TODO: 
    return [];
  }

  sendCard(sender, messageData) {
    // TODO: return promise
  }

  sendCardToCardMessage(sender, messageData) {
    // TODO: return promise
  }
}
window.customElements.define(ChannelPage.is, ChannelPage);