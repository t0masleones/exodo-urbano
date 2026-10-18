import { html, setHtml, type SafeHtml } from './dom';

/** Uma tela dentro do modal. */
export interface View {
  render(): SafeHtml;
  /** Clique em [data-act] dentro do modal. */
  action?(act: string, el: HTMLElement): void | Promise<void>;
  /** Envio de <form> dentro do modal. */
  submit?(form: HTMLFormElement, data: FormData): void | Promise<void>;
  /** Re-renderiza quando o estado do jogo muda (loja, mochila...). */
  live?: boolean;
  /** Não fecha tocando fora nem com Esc/voltar (ex.: escolher entre dois saves). */
  locked?: boolean;
  wide?: boolean;
}

export class Modals {
  private view: View | null = null;

  constructor(
    private overlay: HTMLElement,
    private sheet: HTMLElement,
    private onToggle: (open: boolean) => void,
  ) {}

  get current() {
    return this.view;
  }

  open(v: View) {
    const wasOpen = this.view !== null;
    this.view = v;
    this.sheet.classList.toggle('wide', !!v.wide);
    this.render();
    this.overlay.classList.remove('hidden');
    if (!wasOpen) this.onToggle(true);
    if (matchMedia('(pointer: fine)').matches) this.sheet.querySelector<HTMLElement>('input, select')?.focus();
  }

  /** Retorna true se fechou (usado pelo botão voltar do Android). */
  close(force = false): boolean {
    if (!this.view || (this.view.locked && !force)) return false;
    this.view = null;
    this.overlay.classList.add('hidden');
    setHtml(this.sheet, html``);
    this.onToggle(false);
    return true;
  }

  render() {
    if (this.view) setHtml(this.sheet, this.view.render());
  }

  refreshLive() {
    if (this.view?.live) this.render();
  }

  /** Executa uma ação assíncrona travando o modal (evita clique duplo). */
  async run(result: void | Promise<void>) {
    if (!(result instanceof Promise)) return;
    this.sheet.classList.add('busy');
    try {
      await result;
    } finally {
      this.sheet.classList.remove('busy');
    }
  }
}
