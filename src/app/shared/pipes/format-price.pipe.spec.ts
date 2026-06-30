import { FormatPricePipe } from './format-price.pipe';

describe('FormatPricePipe', () => {
  it('formats prices in Peruvian soles', () => {
    const formatted = new FormatPricePipe().transform(213.23);

    expect(formatted).toContain('S/');
    expect(formatted).not.toContain('€');
  });
});
