class IdentityManager {
  constructor(service) {
    this.service = service;
    this.KEY_ME = "identity-me";
    this.keyInfo = null;
    this.privateKey = null;
    this._signedAddress = null;
  }

  _me() {
    if (!this.privateKey) {
      const saved = this.service.dbService.getLocal(this.KEY_ME);
      if (saved) {
        this.privateKey = new Uint8Array(JSON.parse(saved));
      } else {
        this.privateKey = window.ChannelIdentityUtils.generatePrivateKey();
        this.keyInfo = null;
        this.service.dbService.setLocal(this.KEY_ME, JSON.stringify(Array.from(this.privateKey)));
      }
    }
    if (!this.keyInfo) {
      this.keyInfo = ChannelIdentityUtils.getKeyInfo(this.privateKey);
      this._signedAddress = null;
    }
    return this.keyInfo;
  }

  get signedAddress() {
    if (!this._signedAddress) {
      const keyInfo = this._me();
      this._signedAddress = ChannelIdentityUtils.createSignedAddressIdentity(keyInfo, keyInfo.address);
    }
    return this._signedAddress;
  }

  getSignedIdentity(name, image) {
    const keyInfo = this._me();
    return ChannelIdentityUtils.createSignedFullIdentity(keyInfo, name, image);
  }
}