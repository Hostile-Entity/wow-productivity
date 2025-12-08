// src/utils/coins.ts

export interface CoinBreakdown {
    gold: number;
    silver: number;
    copper: number;
  }
  
  /**
   * Treat internal "coins" as copper.
   * 1 silver = 100 copper
   * 1 gold  = 100 silver = 10_000 copper
   */
  export function coinsToGSC(total: number): CoinBreakdown {
    const abs = Math.abs(total);
    const gold = Math.floor(abs / 10_000);
    const silver = Math.floor((abs % 10_000) / 100);
    const copper = abs % 100;
    return { gold, silver, copper };
  }

  export function formatCoinsShort(amount: number): string {
    const { gold, silver, copper } = coinsToGSC(amount);
    const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
  
    const parts: string[] = [];
  
    if (gold > 0) {
      parts.push(`${gold}g`);
    }
    if (gold > 0 || silver > 0) {
      parts.push(`${silver}s`);
    }
    parts.push(`${copper}c`);
  
    return sign + parts.join(' ');
  }
  
  export function formatCoinsGoldSilver(amount: number): string {
    const { gold, silver } = coinsToGSC(amount);
    const sign = amount < 0 ? '-' : '';
  
    if (gold > 0) {
      // Always show both when there is gold, even if silver is 0.
      return `${sign}${gold}g${silver}s`;
    }
  
    // No gold: show only silver, even if 0 (so 12 copper → 0s)
    return `${sign}${silver}s`;
  }
  