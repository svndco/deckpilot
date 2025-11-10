declare module 'osc' {
  export class UDPPort {
    constructor(options: {
      localAddress: string
      localPort: number
      metadata?: boolean
    })
    on(event: string, callback: (...args: any[]) => void): void
    open(): void
    close(): void
    send(packet: any, address: string, port: number): void
  }
}
