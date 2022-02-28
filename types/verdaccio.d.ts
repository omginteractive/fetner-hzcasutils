declare module 'verdaccio' {
  import {createServer} from 'http';

  type WebServer = ReturnType<typeof createServer>;

  interface VerdaccioAddress {
    port: number;
    path: number;
    host: string;
  }

  type Callback = (webServer: WebServer, addr: VerdaccioAddress) => void;

  function startVerdaccio(
    config: any,
    cliListen: string | number,
    configPath: string,
    pkgVersion: string,
    pkgName: string,
    callback: Callback,
  ): void;
  export default startVerdaccio;
}
