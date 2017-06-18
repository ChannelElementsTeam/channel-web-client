import { Cursor, MongoClient, Db, Collection } from "mongodb";

import { configuration } from "./configuration";
import { ChannelOptions } from "./common/channel-server-messages";

export class Database {
  private db: Db;

  async initialize(): Promise<void> {
    const serverOptions = configuration.get('mongo.serverOptions');
    const options: any = { db: { w: 1 } };
    if (serverOptions) {
      options.server = serverOptions;
    }
    this.db = await MongoClient.connect(configuration.get('mongo.mongoUrl', options));
  }
}

const db = new Database();

export { db };
