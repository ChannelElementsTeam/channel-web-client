class IdentityManager {
  constructor(service) {
    this.service = service;
    this.KEY_ME = "identity-me";
    this.keyInfo = null;
    this.privateKey = null;
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
    }
    return this.keyInfo;
  }

  get signedAddress() {
    const keyInfo = this._me();
    return ChannelIdentityUtils.createSignedAddressIdentity(keyInfo);
  }

  get signedKey() {
    const keyInfo = this._me();
    return ChannelIdentityUtils.createSignedKeyIdentity(keyInfo);
  }
}