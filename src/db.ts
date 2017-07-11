import { Cursor, MongoClient, Db, Collection } from "mongodb";

import { configuration } from "./configuration";
import { ChannelOptions } from "./common/channel-server-messages";
import * as uuid from "uuid";
import { UserRecord, BowerManagementRecord } from "./interfaces/db-records";

export class Database {
  private db: Db;
  private users: Collection;
  private bowerManagement: Collection;

  async initialize(): Promise<void> {
    const serverOptions = configuration.get('mongo.serverOptions');
    const options: any = { db: { w: 1 } };
    if (serverOptions) {
      options.server = serverOptions;
    }
    this.db = await MongoClient.connect(configuration.get('mongo.mongoUrl', options));
    await this.initializeUsers();
    await this.initializeBowerManagement();
  }

  private async initializeUsers(): Promise<void> {
    this.users = this.db.collection('users');
    await this.users.createIndex({ id: 1 }, { unique: true });
  }

  private async initializeBowerManagement(): Promise<void> {
    this.bowerManagement = this.db.collection('bowerManagement');
    await this.bowerManagement.createIndex({ id: 1 }, { unique: true });
  }

  async insertUser(): Promise<UserRecord> {
    const now = Date.now();
    const id = this.createId();
    const record: UserRecord = {
      id: id,
      created: now
    };
    await this.users.insert(record);
    return record;
  }

  async findUserById(id: string): Promise<UserRecord> {
    return await this.users.findOne<UserRecord>({ id: id });
  }

  async upsertBowerManagement(id: string, serverId: string, status: string, timestamp: number, whereStatus?: string, whereTimestamp?: number): Promise<boolean> {
    const record: BowerManagementRecord = {
      id: id,
      serverId: serverId,
      status: status,
      timestamp: timestamp
    };
    const query: any = {
      id: id
    };
    if (whereStatus) {
      query.whereStatus = whereStatus;
    }
    if (typeof whereTimestamp === 'number') {
      query.whereTimestamp = whereTimestamp;
    }
    const writeResult = await this.bowerManagement.updateOne(query, record, { upsert: true });
    return writeResult.upsertedCount === 1 || writeResult.modifiedCount === 1;
  }

  async findBowerManagement(id: string): Promise<BowerManagementRecord> {
    return await this.bowerManagement.findOne<BowerManagementRecord>({ id: id });
  }

  private createId(): string {
    return uuid.v4();
  }

}

const db = new Database();

export { db };
