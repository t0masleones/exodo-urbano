/**
 * Templates HTML seguros por padrão: tudo que é interpolado em html`...` é
 * escapado, a menos que já seja SafeHtml (outro template). Assim um nome,
 * e-mail ou texto vindo de um save adulterado nunca vira código na página.
 *
 * Regras de uso: interpolar só em texto ou em atributos entre aspas; nunca
 * em atributos de evento (onclick), em <script> ou em URLs.
 */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString() {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export const esc = (s: string) => s.replace(/[&<>"'`]/g, (c) => ESCAPES[c]);

function render(v: unknown): string {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(render).join('');
  if (v instanceof SafeHtml) return v.value;
  return esc(String(v));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

export function setHtml(el: Element, content: SafeHtml) {
  el.innerHTML = content.value;
}

export const formatDateTime = (ms: number) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(ms);
