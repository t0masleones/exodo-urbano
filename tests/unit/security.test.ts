import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from '../../vite.config';
import { html } from '../../src/ui/dom';
import { validateEmail, validatePassword } from '../../src/services/account/validation';

describe('templates HTML', () => {
  it('escapa tudo que é interpolado', () => {
    const evil = `<img src=x onerror="alert(1)">'\``;
    expect(html`<b>${evil}</b>`.value).toBe('<b>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#39;&#96;</b>');
  });

  it('não escapa duas vezes templates aninhados', () => {
    expect(html`<ul>${['a<b', 'c'].map((x) => html`<li>${x}</li>`)}</ul>`.value).toBe('<ul><li>a&lt;b</li><li>c</li></ul>');
  });
});

describe('Content Security Policy', () => {
  const prod = contentSecurityPolicy(false);
  it('não permite eval nem scripts inline', () => {
    expect(prod).not.toContain("'unsafe-eval'");
    const scriptSrc = prod.split(';').find((d) => d.trim().startsWith('script-src'));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
  it('bloqueia plugins, <base> e emuladores em produção', () => {
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("base-uri 'none'");
    expect(prod).not.toContain('127.0.0.1');
  });
});

describe('validação de credenciais no cliente', () => {
  it('e-mail', () => {
    expect(validateEmail('carol@exemplo.com.br')).toBeNull();
    expect(validateEmail('sem-arroba')).not.toBeNull();
    expect(validateEmail(`${'a'.repeat(250)}@x.com`)).not.toBeNull();
  });
  it('senha', () => {
    expect(validatePassword('cerrado2026')).toBeNull();
    expect(validatePassword('curta1')).not.toBeNull();
    expect(validatePassword('somenteletras')).not.toBeNull();
    expect(validatePassword('12345678')).not.toBeNull();
  });
});
