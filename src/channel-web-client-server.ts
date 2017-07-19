import * as express from "express";
import { Request, Response } from 'express';
import * as net from 'net';
import * as crypto from "crypto";
import * as url from 'url';
import * as fs from 'fs';
import { db } from "./db";
import { ComponentRequest, ComponentDescriptor, ComponentResponse } from "./common/client-requests";
import { UserRecord } from './interfaces/db-records';
import { BowerHelper, BowerInstallResult } from './bower-helper';

const MAX_HISTORY_BUFFERED_SIZE = 50000;
const USER_COOKIE_NAME = 'channel-elements-web-client-id';

export class ChannelWebClientServer {
  private app: express.Application;
  private shadowComponentsDirectory: string;
  private shadowComponentsPath: string;
  private baseClientUri: string;
  private bowerHelper: BowerHelper;

  constructor(app: express.Application, server: net.Server, baseClientUri: string, restRelativeBaseUrl: string, shadowPublicDirectory: string, shadowPublicPath: string) {
    this.app = app;
    this.baseClientUri = baseClientUri;
    this.registerHandlers(restRelativeBaseUrl);
    this.shadowComponentsDirectory = shadowPublicDirectory;
    this.shadowComponentsPath = shadowPublicPath + '/bower_components';
    this.bowerHelper = new BowerHelper(this.shadowComponentsDirectory);
  }

  async start(): Promise<void> {
    // const result = await this.bowerHelper.install("uuid");
    // console.log("Install", result);
    // noop
  }

  private registerHandlers(restRelativeBaseUrl: string): void {
    this.app.post(restRelativeBaseUrl + '/component', (request: Request, response: Response) => {
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
      void this.bowerHelper.install(pkg).then((pkgInfo) => {
        void this.processComponent(pkgInfo, request, response).then(() => {
          console.log("Component loaded", pkgInfo);
          resolve();
        }).catch((err) => {
          console.error("Error processing component", pkg, err);
          response.status(400).send("Unable to load component: " + err.toString());
          resolve();
        });
      }).catch((err) => {
        console.error(err.mesage || err);
        response.status(503).send("Failure: " + (err.mesage || err));
        resolve();
      });
    });
  }

  private async processComponent(pkgInfo: BowerInstallResult, request: ChannelsRequest, response: Response): Promise<void> {
    if (!pkgInfo || !pkgInfo.pkgMeta) {
      throw new Error("Package is invalid or incomplete");
    }
    if (!pkgInfo.pkgMeta.main) {
      throw new Error("Invalid package:  'main' is missing");
    }
    const componentPath = this.shadowComponentsDirectory + '/bower_components/' + pkgInfo.endpoint.name + '/' + 'channels-component.json';
    try {
      if (!fs.existsSync(componentPath)) {
        throw new Error("Invalid component:  channels-component.json is missing");
      }
      const content = fs.readFileSync(componentPath, 'utf-8');
      const descriptor = JSON.parse(content) as ComponentDescriptor;
      if (!descriptor || !descriptor.composerTag || !descriptor.viewerTag) {
        throw new Error("Invalid component descriptor in channel-component.json");
      }
      const componentResponse: ComponentResponse = {
        source: pkgInfo.endpoint.source,
        importHref: this.shadowComponentsPath + '/' + pkgInfo.endpoint.name + '/' + pkgInfo.pkgMeta.main,
        package: pkgInfo,
        channelComponent: descriptor
      };
      response.json(componentResponse);
    } catch (err) {
      throw err;
    }
  }
}

export interface ChannelsContext {
  user?: UserRecord;
}

export interface ChannelsRequest extends Request {
  channelsContext: ChannelsContext;
}
