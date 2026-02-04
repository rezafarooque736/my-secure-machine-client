declare module 'guacamole-common-js' {
  export class WebSocketTunnel {
    constructor(url: string);
  }

  export class Client {
    constructor(tunnel: WebSocketTunnel);
    connect(data: string): void;
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
  }

  export class Mouse {
    constructor(element: HTMLElement);
    onmousedown: ((state: any) => void) | null;
    onmouseup: ((state: any) => void) | null;
    onmousemove: ((state: any) => void) | null;

    static Touchscreen: typeof Touchscreen;
  }

  export class Touchscreen {
    constructor(element: HTMLElement);
    onmousedown: ((state: any) => void) | null;
    onmouseup: ((state: any) => void) | null;
    onmousemove: ((state: any) => void) | null;
  }

  export class Keyboard {
    constructor(element: Document | HTMLElement);
    onkeydown: ((keysym: number) => void) | null;
    onkeyup: ((keysym: number) => void) | null;
  }

  const Guacamole: {
    WebSocketTunnel: typeof WebSocketTunnel;
    Client: typeof Client;
    Display: typeof Display;
    Mouse: typeof Mouse;
    Keyboard: typeof Keyboard;
  };

  export default Guacamole;
}
