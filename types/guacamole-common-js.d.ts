declare module 'guacamole-common-js' {
  export class WebSocketTunnel {
    constructor(url: string);
    onerror: ((status: any) => void) | null;
    onstatechange: ((state: number) => void) | null;
  }

  export class Client {
    constructor(tunnel: WebSocketTunnel);
    connect(data?: string): void;
    disconnect(): void;
    getDisplay(): Display;
    sendMouseState(state: any): void;
    sendKeyEvent(pressed: number, keysym: number): void;
    sendSize(width: number, height: number): void;
    onstatechange: ((state: number) => void) | null;
    onerror: ((error: any) => void) | null;
  }

  export class Display {
    getElement(): HTMLElement;
    getWidth(): number;
    getHeight(): number;
  }

  export class Mouse {
    constructor(element: HTMLElement);
    onmousedown: ((state: any) => void) | null;
    onmouseup: ((state: any) => void) | null;
    onmousemove: ((state: any) => void) | null;
  }

  export class Keyboard {
    constructor(element: HTMLElement | Document);
    onkeydown: ((keysym: number) => boolean | void) | null;
    onkeyup: ((keysym: number) => void) | null;
    reset(): void;
  }

  export class Touchscreen {
    constructor(element: HTMLElement);
    onmousedown: ((state: any) => void) | null;
    onmouseup: ((state: any) => void) | null;
    onmousemove: ((state: any) => void) | null;
  }

  export class Touch {
    // Touch interface
  }

  // State constants
  export const Client: {
    IDLE: 0;
    CONNECTING: 1;
    WAITING: 2;
    CONNECTED: 3;
    DISCONNECTING: 4;
    DISCONNECTED: 5;
  };
}
