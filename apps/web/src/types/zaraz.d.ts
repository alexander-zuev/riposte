export type { Zaraz }

declare global {
  interface Zaraz {
    track(
      eventName: string,
      eventProperties?: Record<string, string | number | boolean>,
    ): Promise<void>
    set(
      key: string,
      value: string | number | boolean,
      options?: { scope?: 'page' | 'session' | 'persist' },
    ): void
    spaPageview(): void
  }

  interface Window {
    zaraz?: Zaraz
  }
}
