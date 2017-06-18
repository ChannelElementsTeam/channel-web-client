import * as express from "express";
import { Request, Response } from 'express';
import * as net from 'net';
import * as crypto from "crypto";
import * as url from 'url';

const MAX_HISTORY_BUFFERED_SIZE = 50000;

export class ChannelWebClientServer {
  private app: express.Application;

  constructor(app: express.Application, server: net.Server, baseClientUri: string, restRelativeBaseUrl: string) {
    this.app = app;
    this.registerHandlers(restRelativeBaseUrl);
  }

  start(): void {
    // noop
  }

  private registerHandlers(restRelativeBaseUrl: string): void {
    // this.app.post(restRelativeBaseUrl + '/register', (request: Request, response: Response) => {
    //   void this.handleRegister(request, response);
    // });
  }
}
