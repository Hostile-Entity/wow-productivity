if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${(import.meta as any).env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .catch((e) => console.warn('SW registration failed:', e));
  });
}