import { io, Socket } from "socket.io-client";
import { Logger } from "../util";

export type Event =
  | "any"
  | "line"
  | "status"
  | "starting"
  | "online"
  | "stopping"
  | "offline"
  | "login"
  | "logout"
  | "rconRunning"
  | "connect"
  | "disconnect";

export enum Status {
  Offline = "offline",
  Starting = "starting",
  Online = "online",
  Stopping = "stopping",
}

export class ObserverClient {
  private _socket: Socket;
  private _isReady = false;

  private _events: { [key: string]: (...args: any) => any } = {
    connect: (error?: any) => {},
    disconnect: () => {},
  };

  constructor(private _options: { name: string; url: string; apiKey: string }) {
    this._socket = io(_options.url, { autoConnect: false });
    // Connect event
    this._socket.on("connect", async () => {
      let connected = false;
      let errorCode;
      try {
        connected = await this.authenticate();
      } catch (error) {
        errorCode = error;
      }
      this._isReady = connected;
      this._events["connect"](errorCode);
    });
    // Disconnect event
    this._socket.on("disconnect", () => {
      this._events["disconnect"]();
    });
  }

  /** Connects to the ObserverMC Server */
  connect() {
    Logger.log("Connecting to " + this._options.url);
    this._socket.connect();
  }

  /** Set callbacks for events */
  on(
    event: "any",
    callbackFn: (serverName: string, event: { event: string; data: any }) => any
  ): any;
  on(event: "line", callbackFn: (serverName: string, line: string) => any): any;
  on(
    event: "status",
    callbackFn: (serverName: string, status: Status) => any
  ): any;
  on(
    event: "starting",
    callbackFn: (
      serverName: string,
      data: { time: string; version: string }
    ) => any
  ): any;
  on(
    event: "online",
    callbackFn: (serverName: string, data: { time: string; run: string }) => any
  ): any;

  on(
    event: "stopping",
    callbackFn: (serverName: string, data: { time: string }) => any
  ): any;
  on(
    event: "offline",
    callbackFn: (serverName: string, data: { time: string }) => any
  ): any;
  on(
    event: "login",
    callbackFn: (
      serverName: string,
      data: {
        time: string;
        user: string;
        ip: string;
        port: string;
        entity: string;
        world: string;
        x: string;
        y: string;
        z: string;
      }
    ) => any
  ): any;
  on(
    event: "logout",
    callbackFn: (
      serverName: string,
      data: { time: string; user: string }
    ) => any
  ): any;
  on(
    event: "rconRunning",
    callbackFn: (
      serverName: string,
      data: { time: string; ip: string; port: string }
    ) => any
  ): any;
  on(event: "line", callbackFn: (line: string) => any): any;
  on(event: "connect", callbackFn: (error?: string) => any): any;
  on(event: "disconnect", callbackFn: () => any): any;
  on(event: Event, callbackFn: (...args: any) => any) {
    this._events[event] = callbackFn;
    this._socket.on("event:" + event, this._events[event]);
  }

  /** Start a server */
  start(serverName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.authenticate();
      } catch (error) {}
      this._socket.emit(
        "start",
        serverName,
        (success: boolean, error: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(success);
        }
      );
    });
  }

  /** Stop a server */
  stop(serverName: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      await this.authenticate();
      this._socket.emit(
        "stop",
        serverName,
        (success: boolean, error: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(success);
        }
      );
    });
  }

  /** Send a console command to a server */
  console(serverName: string, command: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      await this.authenticate();
      this._socket.emit(
        "console",
        serverName,
        command,
        (success: boolean, error: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(success);
        }
      );
    });
  }

  /** Get an online player list from a server */
  getOnlinePlayers(serverName: string): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      await this.authenticate();
      this._socket.emit(
        "onlinePlayers",
        serverName,
        (onlinePlayers: string[], error: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(onlinePlayers);
        }
      );
    });
  }

  /** Gets a server status */
  getStatus(serverName: string): Promise<Status> {
    return new Promise(async (resolve, reject) => {
      await this.authenticate();
      this._socket.emit(
        "status",
        serverName,
        (status: Status, error: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(status);
        }
      );
    });
  }

  /** Control the server whitelist */
  whitelist(
    serverName: string,
    action: "list" | "add" | "remove",
    username?: string
  ): Promise<{ uuid: string; name: string }[] | boolean> {
    return new Promise(async (resolve, reject) => {
      await this.authenticate();
      this._socket.emit(
        "whitelist",
        serverName,
        { action, username },
        (res: { uuid: string; name: string }[] | boolean, error: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(res);
        }
      );
    });
  }

  private authenticate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._socket.emit(
        "authenticate",
        this._options.name,
        this._options.apiKey,
        (success: boolean, error: string) => {
          if (error !== "authenticated") {
            reject(error);
            return;
          }
          resolve(success);
        }
      );
    });
  }

  /** Check if client is ready to send commands */
  get isReady(): boolean {
    return this._isReady;
  }

  get name(): string {
    return this._options.name;
  }
}
