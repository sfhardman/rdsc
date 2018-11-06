const match = require('../match');

describe('match', () => {
  it('matches primitives', () => {
    expect(match(1,1)).toBe(true);;
    expect(match(true,true)).toBe(true);
    expect(match('123','123')).toBe(true);      
  });
  it('rejects mismatched primitives', () => {
    expect(() => match(1,2)).toThrowError();
    expect(() => match(false,true)).toThrowError();
    expect(() => match('123','111')).toThrowError();        
  });
  it('matches subset objects', () => {
    const expected = {
      a: 1,
      b: 2,
    };
    const actual = {
      a: 1,
      b: 2,
      c: 3,
    };
    expect(match(expected, actual)).toBe(true);
  });
  it('rejects mismatched objects', () => {
    const expected = {
      a: 1,
      b: 2,
      c: 2,
    };
    const actual = {
      a: 1,
      b: 2,
    };
    expect(() => match(expected, actual)).toThrowError();
  });
  it('deep matches subset objects', () => {
    const expected = {
      a: 1,
      b: 2,
      d: {
        suba: 1,
      }
    };
    const actual = {
      a: 1,
      b: 2,
      c: 3,
      d: {
        suba: 1,
        subb: 2,
      }
    };
    expect(match(expected, actual)).toBe(true);
  });
  it('rejects deep mismatched subset objects', () => {
    const expected = {
      a: 1,
      b: 2,
      d: {
        suba: 1,
        subb: 2,
      }
    };
    const actual = {
      a: 1,
      b: 2,
      c: 3,
      d: {
        suba: 1,
      }
    };
    expect(() => match(expected, actual)).toThrowError();
  });
  it('matches primitive array properties', () => {
    const expected = {
      a: [1, 2],
    };
    const actual = {
      a: [1, 2],
    };
    expect(match(expected, actual)).toBe(true);
  });
  it('rejects mismatched length primitive array properties', () => {
    const expected = {
      a: [1],
    };
    const actual = {
      a: [1, 2],
    };
    expect(() => match(expected, actual)).toThrowError();
  });
  it('rejects mismatched elements primitive array properties', () => {
    const expected = {
      a: [1, 3],
    };
    const actual = {
      a: [1, 2],
    };
    expect(() => match(expected, actual)).toThrowError();
  });
  it('matches primitive array properties regardless of order', () => {
    const expected = {
      a: [2, 1],
    };
    const actual = {
      a: [1, 2],
    };
    expect(match(expected, actual)).toBe(true);
  });
  it('matches object array properties', () => {
    const expected = {
      a: [
        { x: 1 },
        { y: 2 },
      ],
    };
    const actual = {
      a: [
        { y: 2, z: 34 },
        { x: 1 },
      ],
    };
    expect(match(expected, actual)).toBe(true);
  });
  it('rejects mismatched object array properties', () => {
    const expected = {
      a: [
        { x: 1, z: 3 },
        { y: 2 },
      ],
    };
    const actual = {
      a: [
        { y: 2 },
        { x: 1 },
      ],
    };
    expect(() => match(expected, actual)).toThrowError();
  });
});