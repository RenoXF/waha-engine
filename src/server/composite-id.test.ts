import { expect, test } from 'bun:test';
import { compositeId } from './messages';

test('compositeId menyamai format id WAHA `{fromMe}_{remoteJid}_{id}[_{participant}]`', () => {
  expect(compositeId('6281@s.whatsapp.net', { id: 'ABC', remoteJid: '6281@s.whatsapp.net', fromMe: true })).toBe(
    'true_6281@s.whatsapp.net_ABC'
  );
  expect(compositeId('x@g.us', { id: 'ABC', remoteJid: 'x@g.us', fromMe: true, participant: 'p@lid' })).toBe(
    'true_x@g.us_ABC_p@lid'
  );
  // id dari webhook sudah composite — jangan ditempeli lagi
  expect(compositeId('x@g.us', { id: 'true_x@g.us_ABC' })).toBe('true_x@g.us_ABC');
  // remoteJid hilang: pakai recipient
  expect(compositeId('x@g.us', { id: 'ABC', fromMe: true })).toBe('true_x@g.us_ABC');
  expect(compositeId('x@g.us', {})).toBeUndefined();
});
