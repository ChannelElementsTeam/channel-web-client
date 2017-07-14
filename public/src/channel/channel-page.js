class ChannelPage extends Polymer.Element {
  static get is() { return 'channel-page'; }

  static get properties() {
    return {
      channelInfo: {
        type: Object,
        observer: 'refreshChannel'
      },
      joinData: {
        type: Object,
        observer: 'onChannelJoined'
      },
      items: Array,
      pinnedData: Object,
      pinnedCard: String
    }
  }

  constructor() {
    super();
    this._pendingCardMessages = {};
    this._pendingPinnedCard = null;
  }

  onActivate(route) {
    this.onDeactivate();
    this._route = route;
    this.setOnline(true);
    this.providerId = parseInt(route.segments[1]), 10;
    this.channelAddress = route.segments[2];
    this.refresh(route.context);
  }

  onDeactivate() {
    this._route = null;
    this.setBottomDrawer(false);
    this.$.controller.delegate.detach();
    this._pendingCardMessages = {};
    if (this.joinData) {
      $channels.leaveChannel({ channelAddress: this.joinData.channelAddress }).then(() => { });
      this.joinData = null;
    }
  }

  refresh(info) {
    if (info) {
      this.set("channelInfo", info);
    } else {
      $channels.getChannel(this.providerId, $service.identityManager.signedAddress, this.channelAddress).then((response) => {
        console.log("channel info", response);
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
      title: this.channelInfo.name,
      actions: barActions
    });

    this.$.controller.delegate.detach();
    // connect socket and join channel
    console.log("Connecting to socket for channel: ", this.channelInfo.channelAddress);
    $channels.connectTransport(this.providerId, this.channelInfo.channelAddress, this.channelInfo.transportUrl).then(() => {
      const joinRequest = {
        channelAddress: this.channelInfo.channelAddress,
        memberIdentity: $service.identityManager.signedAddress
      };
      $channels.joinChannel(joinRequest).then((joinResponse) => {
        console.log("Joined channel: ", joinResponse);
        this.set("joinData", joinResponse);
        this.enableComposeArea(true);
        this.loadLastComposer();
      });
    }).catch((err) => {
      console.error(err);
    });
  }

  onChannelJoined() {
    if (!this.channelInfo) {
      return;
    }
    if (!this.joinData) {
      return;
    }

    // Attach controller
    this.$.controller.delegate.channelInfo = this.channelInfo;
    this.$.controller.delegate.joinData = this.joinData;
    this.$.controller.delegate.attach();

    // Clear view
    this.set("items", []);

    const loadHistory = () => {
      // load history
      console.log("Fetching history");
      this._pendingCardMessages = {};
      $channels.getHistory({
        channelAddress: this.channelInfo.channelAddress,
        before: (new Date()).getTime(),
        maxCount: 100
      }).then((response) => {
        console.log("History: ", response);
      });
    };

    this._pendingPinnedCard = null;
    $service.dbService.getPinnedCards(this.channelInfo.channelAddress).then((cardList) => {
      if (cardList && cardList.length) {
        this._pendingPinnedCard = cardList[cardList.length - 1];
      }
      loadHistory();
    }).catch(() => {
      loadHistory();
    });
  }

  deleteChannel() {
    $channels.deleteChannel(this.providerId, $service.identityManager.signedAddress, this.channelInfo.channelAddress).then(() => { });
  }

  shareChannel() {
    const shareRequest = {
      channel: this.channelAddress
    };
    $channels.shareChannel(this.providerId, $service.identityManager.signedAddress, shareRequest).then((shareResponse) => {
      Polymer.importHref(this.resolveUrl("../dialogs/invite-code-dlg.html"), () => {
        this.$.dlgInvite.code = shareResponse.shareCodeUrl;
        this.$.dlgInvite.show();
      });
    });
  }

  // Compose area support methods

  onComponents() {
    this.setBottomDrawer(true);
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
    var detail = event.detail;
    $service.componentManager.get(detail.source).then((pkg) => {
      if (pkg && pkg.importHref) {
        Polymer.importHref(this.resolveUrl(pkg.importHref), () => {
          this.switchToComposer(pkg);
        });
      }
    }).catch((err) => {
      console.error("Failed to import component", err);
    });
  }

  clearElement(node) {
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  }

  switchToComposer(pkg) {
    console.log("Switched composer: ", pkg);
    this.clearElement(this.$.composerPanel);

    var e = document.createElement(pkg.channelComponent.composerTag);
    e.packageSource = pkg.source;
    e.mode = "compose";
    e.channel = this.$.controller.delegate;
    this.currentComposeElement = e;

    this.$.composerPanel.appendChild(e);
    this.$.noComposer.style.display = "none";
    this.$.composerPanel.style.display = "";

    $service.dbService.setLocal("last-compose-package", pkg.source);
  }

  loadLastComposer() {
    if (!this.currentComposeElement) {
      var packageSource = $service.dbService.getLocal("last-compose-package");
      if (packageSource) {
        this.$.picker.loadComponent(packageSource, false);
      }
    }
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

  // handle events from controller

  onMessage(event) {
    var detail = event.detail;
    if (detail) {
      this.processMessage(detail);
    }
  }

  onHistoryMessage(event) {
    var detail = event.detail;
    if (detail) {
      this.processMessage(detail);
    }
  }

  onChannelDeleted() {
    $router.goto("");
  }

  onSocketConnection(event) {
    const connected = event.detail.connected;
    if (this._online !== connected) {
      if (!connected) {
        this.setOnline(false);
      } else {
        this.onActivate(this._route);
      }
    }
  }

  setOnline(online) {
    if (this._online !== online) {
      this._online = online;
      this.$.offlinePanel.style.display = online ? "none" : "";
    }
  }

  processMessage(detail) {
    const channelMessage = detail.channelMessage;
    if (channelMessage.valid) {
      const msg = channelMessage.json;
      const msgDetails = msg.details;
      switch (msg.type) {
        case 'add-card': {
          $service.componentManager.get(msgDetails.package).then((pkg) => {
            Polymer.importHref(this.resolveUrl(pkg.importHref), () => {
              detail.package = pkg;
              this.insertMessage(msgDetails.cardId, detail);
            });
          }).catch((err) => {
            console.error("Failed to import component", err);
          });
          break;
        }
        case 'card-to-card':
          // find card item with the spciedif id
          const cardView = this.shadowRoot.querySelector('channel-card[data-card="' + msgDetails.cardId + '"]');
          if (cardView) {
            cardView.handleCardToCardMessage(detail);
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

  insertMessage(cardId, detail) {
    const itemData = {
      cardId: cardId,
      detail: detail,
      channel: this.$.controller.delegate,
      pinOnLoad: (cardId === this._pendingPinnedCard)
    }
    if (this._pendingCardMessages[cardId]) {
      itemData.pendingCardMessages = this._pendingCardMessages[cardId];
      delete this._pendingCardMessages[cardId];
    }
    const timestamp = itemData.detail.message.timestamp;
    let index = -1;
    for (var i = 0; i < this.items.length; i++) {
      const t2 = this.items[i].detail.message.timestamp;
      if (timestamp < t2) {
        index = i;
        break;
      }
    }
    if (index < 0) {
      this.push('items', itemData);
    } else {
      this.splice("items", index, 0, itemData);
    }
  }

  onItemPin(event) {
    const pin = event.detail.pin;
    const cardId = event.model.item.cardId;
    if (!pin) {
      event.target.classList.remove("pinnedCard");
      event.target.pinned = false;
      this.pinnedCard = null;
      this.$.spacer.style.height = "0";
    } else {
      if (this.pinnedCard) {
        this.pinnedCard.classList.remove("pinnedCard");
        this.pinnedCard.pinned = false;
      }
      this.pinnedCard = event.target;
      this.pinnedCard.classList.add("pinnedCard");
      this.pinnedCard.pinned = true;
      this.$.spacer.style.height = (this.pinnedCard.offsetHeight * 1.5) + "px";
    }
    const cardList = pin ? [cardId] : [];
    $service.dbService.savePinnedCards(this.channelInfo.channelAddress, cardList).then(() => { });
  }

  onItemRender(event) {
    if (event.model.index === (this.items.length - 1)) {
      this.scrollToBottom();
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