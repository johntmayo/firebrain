/**
 * Operator (user) display helpers. The three known operators map to fixed
 * display names and avatar tones; anyone else falls back to their email
 * local-part.
 */
export type OperatorTone = 'john' | 'steph' | 'megan' | 'other';

export interface OperatorDirectory {
  johnEmail: string;
  stephEmail: string;
  meganEmail: string;
}

export interface OperatorInfo {
  email: string;
  name: string;
  initial: string;
  tone: OperatorTone;
}

export function describeOperator(email: string, dir: OperatorDirectory): OperatorInfo {
  if (email === dir.johnEmail) return { email, name: 'John', initial: 'J', tone: 'john' };
  if (email === dir.stephEmail) return { email, name: 'Stef', initial: 'S', tone: 'steph' };
  if (email === dir.meganEmail) return { email, name: 'Megan', initial: 'M', tone: 'megan' };
  const local = (email || '').split('@')[0] || '?';
  return { email, name: local, initial: local.charAt(0).toUpperCase() || '?', tone: 'other' };
}
