import { describe, expect, it } from 'vitest';
import { escapeHtml, receiptHtml } from './print';
import { demoCustomers, demoProducts } from '../data';

describe('thermal receipt safety', () => {
  it('escapes untrusted html', () => expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;'));
  it('does not include customer markup as executable html', () => {
    const html = receiptHtml({ invoice:'INV-1', customer:{...demoCustomers[0],name:'<img src=x onerror=alert(1)>'}, lines:[{productName:demoProducts[0].name,unitName:demoProducts[0].units[0].name,unitPrice:demoProducts[0].units[0].price,qty:1,discount:0}],paid:5000,total:3500 });
    expect(html).not.toContain('<img src=x'); expect(html).toContain('&lt;img src=x');
  });
});
