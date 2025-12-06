// Simple EV ledger used to smooth chest payouts over time
export class EVLedger {
    paid: number;
    target: number;
    readonly minMult: number;
    readonly maxMult: number;
  
    constructor(minMult = 0.85, maxMult = 1.2) {
      this.paid = 0;
      this.target = 0;
      this.minMult = minMult;
      this.maxMult = maxMult;
    }
  
    multiplier(baselineEv: number, targetThis: number): number {
      if (baselineEv <= 1e-9) return 1.0;
  
      const debt = this.target - this.paid;
      const desired = Math.max(0, targetThis + debt);
      const m = desired / baselineEv;
  
      if (m < this.minMult) return this.minMult;
      if (m > this.maxMult) return this.maxMult;
      return m;
    }
  }
  