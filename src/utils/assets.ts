export function assetUrl(path: string): string {
    const base = import.meta.env.BASE_URL || '/';
    // avoid double slashes when path starts with `/`
    const normalized = path.replace(/^\//, '');
    return base + normalized;
  }