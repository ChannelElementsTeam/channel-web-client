import * as express from "express";
import { Request, Response } from 'express';
import * as net from 'net';
import * as crypto from "crypto";
import * as url from 'url';
import * as fs from 'fs';
import { db } from "./db";
import { ComponentRequest, ComponentDescriptor, ComponentResponse } from "./common/client-requests";
import { UserRecord } from './interfaces/db-records';
const bower = require('bower');

const MAX_HISTORY_BUFFERED_SIZE = 50000;
const USER_COOKIE_NAME = 'channel-elements-web-client-id';

export class ChannelWebClientServer {
  private app: express.Application;
  private shadowComponentsDirectory: string;
  private shadowComponentsPath: string;
  private baseClientUri: string;

  constructor(app: express.Application, server: net.Server, baseClientUri: string, restRelativeBaseUrl: string, shadowPublicDirectory: string, shadowPublicPath: string) {
    this.app = app;
    this.baseClientUri = baseClientUri;
    this.registerHandlers(restRelativeBaseUrl);
    this.shadowComponentsDirectory = shadowPublicDirectory + '/bower_components';
    this.shadowComponentsPath = shadowPublicPath + '/bower_components';
  }

  start(): void {
    // noop
  }

  private registerHandlers(restRelativeBaseUrl: string): void {
    this.app.get(restRelativeBaseUrl + '/component', (request: Request, response: Response) => {
      void this.handleComponent(request as ChannelsRequest, response);
    });
  }

  async initializeRequest(request: ChannelsRequest, response: Response): Promise<void> {
    if (!request.channelsContext) {
      request.channelsContext = {};
    }
    // if (request.cookies[USER_COOKIE_NAME]) {
    //   request.channelsContext.user = await db.findUserById(request.cookies[USER_COOKIE_NAME]);
    // }
    // if (!request.channelsContext.user) {
    //   request.channelsContext.user = await db.insertUser();
    //   response.cookie(USER_COOKIE_NAME, request.channelsContext.user.id, { maxAge: 1000 * 60 * 60 * 24 * 365 });
    // }
  }

  private async handleComponent(request: ChannelsRequest, response: Response): Promise<void> {
    let pkg = request.query.package as string;
    if (!pkg) {
      const componentRequest = request.body as ComponentRequest;
      if (!componentRequest || !componentRequest.package) {
        response.status(400).send("Invalid request:  missing package");
        return;
      }
      pkg = componentRequest.package;
    }
    if (!pkg) {
      response.status(400).send("Invalid request:  missing package");
      return;
    }
    // Following code is to help those who might copy a hyperlink to a GitHub project, when bower
    // requires that they point to ".git" for a GitHub project.
    if (pkg.startsWith('https://github.com/') && pkg.lastIndexOf('/') > pkg.lastIndexOf('.')) {
      pkg = pkg + '.git';
    }
    return new Promise<void>((resolve, reject) => {
      let pkgInfo: any;
      console.log("Bower.install " + pkg + "...");
      bower.commands
        .install([pkg], { production: true, json: true }, { directory: this.shadowComponentsDirectory })
        .on('end', (installed: any) => {
          if (pkgInfo && pkgInfo.pkgMeta && pkgInfo.pkgMeta.name && pkgInfo.pkgMeta.main) {
            void this.processComponent(pkgInfo, request, response).then(() => {
              console.log("Component loaded", pkgInfo);
              resolve();
            }).catch((err) => {
              console.error("Error processing component", pkgInfo, err);
              response.status(400).send("Unable to load component: " + err.toString());
            });
          } else {
            console.warn("Component appears incorrect.  Rejecting", pkgInfo);
            response.status(400).send("Component does not appear to be correct.  pkgMeta is missing or incomplete (require at least name and main).");
            resolve();
          }
        })
        .on('error', (err: any) => {
          console.warn("Error while loading component", err);
          response.status(400).send("Error while loading component: " + err.toString());
          resolve();
        })
        .on('log', (log: any) => {
          if (log.data && log.data.endpoint && log.data.endpoint.source === pkg) {
            pkgInfo = log.data;
          }
          console.log("Bower logging:", log);
        });
    });
  }

  private async processComponent(pkgInfo: any, request: ChannelsRequest, response: Response): Promise<void> {
    const path = this.shadowComponentsDirectory + '/' + pkgInfo.pkgMeta.name + '/' + 'channels-component.json';
    try {
      if (!fs.existsSync(path)) {
        throw new Error("Invalid component:  channels-component.json is missing");
      }
      const content = fs.readFileSync(path, 'utf-8');
      const descriptor = JSON.parse(content) as ComponentDescriptor;
      if (!descriptor || !descriptor.composerTag || !descriptor.viewerTag) {
        throw new Error("Invalid component descriptor in channel-component.json");
      }
      const componentResponse: ComponentResponse = {
        source: pkgInfo.endpoint.source,
        packageName: pkgInfo.pkgMeta.name,
        importHref: this.shadowComponentsPath + '/' + pkgInfo.pkgMeta.name + '/' + pkgInfo.pkgMeta.main,
        package: pkgInfo.pkgMeta,
        channelComponent: descriptor
      };
      response.json(componentResponse);
    } catch (err) {
      await this.uninstallComponent(pkgInfo, request, response);
      throw err;
    }
  }

  private async uninstallComponent(pkgInfo: any, request: ChannelsRequest, response: Response): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      bower.commands
        .uninstall([pkgInfo.pkgMeta.name], { json: true }, { directory: this.shadowComponentsDirectory })
        .on('end', (installed: any) => {
          console.error("Uninstalled component", pkgInfo);
          resolve();
        })
        .on('error', (err: any) => {
          console.error("Failure trying to uninstall a component", pkgInfo);
          resolve();
        })
        .on('log', (log: any) => {
          console.log("Bower logging while uninstalling:", log);
        });
    });
  }

}

export interface ChannelsContext {
  user?: UserRecord;
}

export interface ChannelsRequest extends Request {
  channelsContext: ChannelsContext;
}
