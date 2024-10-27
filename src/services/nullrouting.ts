class NullRouting {
  constructor(private enabled: boolean = false) {}

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const NullRoutingService: NullRouting = new NullRouting();
