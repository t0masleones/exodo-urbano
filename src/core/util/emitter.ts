type Handler = (...args: unknown[]) => void;

/**
 * Emissor de eventos tipado e sem dependências: o compilador confere o nome
 * do evento e os argumentos de quem emite e de quem escuta.
 */
export class Emitter<E extends Record<string, unknown[]>> {
  private handlers = new Map<keyof E, Set<Handler>>();

  on<K extends keyof E>(event: K, fn: (...args: E[K]) => void): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn as unknown as Handler);
    return () => this.off(event, fn);
  }

  off<K extends keyof E>(event: K, fn: (...args: E[K]) => void) {
    this.handlers.get(event)?.delete(fn as unknown as Handler);
  }

  emit<K extends keyof E>(event: K, ...args: E[K]) {
    for (const fn of [...(this.handlers.get(event) ?? [])]) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Erro num ouvinte de "${String(event)}"`, err);
      }
    }
  }
}
