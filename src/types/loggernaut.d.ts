declare module 'loggernaut' {
  interface Loggernaut {
    log: (message: any) => void;
    info: (message: any) => void;
    debug: (message: any) => void;
    warn: (message: any) => void;
    error: (message: any) => void;
    trace: (message: any) => void;
    // Add other methods and properties as needed
  }

  const loggernaut: Loggernaut;
  export default loggernaut;
}
