import { describe, expect, it } from 'vitest';
import { describeOperator } from './operators';

const dir = { johnEmail: 'john@x.test', stephEmail: 'stef@x.test', meganEmail: 'megan@x.test' };

describe('describeOperator', () => {
  it('maps the three known operators', () => {
    expect(describeOperator('john@x.test', dir)).toMatchObject({ name: 'John', initial: 'J', tone: 'john' });
    expect(describeOperator('stef@x.test', dir)).toMatchObject({ name: 'Stef', initial: 'S', tone: 'steph' });
    expect(describeOperator('megan@x.test', dir)).toMatchObject({ name: 'Megan', initial: 'M', tone: 'megan' });
  });
  it('falls back to the email local-part for anyone else', () => {
    expect(describeOperator('quinn.r@elsewhere.test', dir)).toMatchObject({ name: 'quinn.r', initial: 'Q', tone: 'other' });
  });
  it('never throws on empty input', () => {
    expect(describeOperator('', dir)).toMatchObject({ name: '?', initial: '?', tone: 'other' });
  });
});
