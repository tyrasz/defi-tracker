import { describe, it, expect } from 'vitest';
import { serializeBigInts } from './serialize';

describe('serializeBigInts', () => {
  it('should convert BigInt to string', () => {
    const input = 123456789n;
    const result = serializeBigInts(input);
    expect(result).toBe('123456789');
  });

  it('should handle null and undefined', () => {
    expect(serializeBigInts(null)).toBe(null);
    expect(serializeBigInts(undefined)).toBe(undefined);
  });

  it('should handle primitive types', () => {
    expect(serializeBigInts(42)).toBe(42);
    expect(serializeBigInts('hello')).toBe('hello');
    expect(serializeBigInts(true)).toBe(true);
  });

  it('should convert BigInts in arrays', () => {
    const input = [1n, 2n, 3n];
    const result = serializeBigInts(input);
    expect(result).toEqual(['1', '2', '3']);
  });

  it('should convert BigInts in objects', () => {
    const input = {
      balance: 100000000000000000n,
      amount: 50000000000000000n,
    };
    const result = serializeBigInts(input);
    expect(result).toEqual({
      balance: '100000000000000000',
      amount: '50000000000000000',
    });
  });

  it('should recursively convert nested structures', () => {
    const input = {
      user: 'alice',
      tokens: [
        { symbol: 'ETH', balance: 1000000000000000000n },
        { symbol: 'DAI', balance: 5000000000000000000n },
      ],
      metadata: {
        chainId: 1,
        blockNumber: 18000000n,
      },
    };

    const result = serializeBigInts(input);
    expect(result).toEqual({
      user: 'alice',
      tokens: [
        { symbol: 'ETH', balance: '1000000000000000000' },
        { symbol: 'DAI', balance: '5000000000000000000' },
      ],
      metadata: {
        chainId: 1,
        blockNumber: '18000000',
      },
    });
  });

  it('should handle mixed types in arrays', () => {
    const input = [1, 'test', 100n, true, { value: 200n }];
    const result = serializeBigInts(input);
    expect(result).toEqual([1, 'test', '100', true, { value: '200' }]);
  });

  it('should handle empty objects and arrays', () => {
    expect(serializeBigInts({})).toEqual({});
    expect(serializeBigInts([])).toEqual([]);
  });

  it('should preserve zero BigInt', () => {
    const input = { balance: 0n };
    const result = serializeBigInts(input);
    expect(result).toEqual({ balance: '0' });
  });

  it('should handle very large BigInts', () => {
    const largeValue = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
    const result = serializeBigInts(largeValue);
    expect(result).toBe('115792089237316195423570985008687907853269984665640564039457584007913129639935');
  });
});
