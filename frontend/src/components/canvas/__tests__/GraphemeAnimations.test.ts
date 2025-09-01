import { getTypewriterText, getDrawInText } from '../utils/animationUtils';

describe('Grapheme-aware animations', () => {
  it('typewriter does not split emoji', () => {
    const txt = '🤔🙂';
    const t0 = getTypewriterText(txt, 0.5, 0, 1); // 50%
    expect(['', '🤔']).toContain(t0); // depending on rounding, allow 0 or first

    const t1 = getTypewriterText(txt, 1, 0, 1);
    expect(t1).toBe(txt);
  });

  it('drawIn does not split emoji', () => {
    const txt = '🤔🙂';
    const d0 = getDrawInText(txt, 0.5, 0, 1, 'linear');
    expect(['', '🤔']).toContain(d0);

    const d1 = getDrawInText(txt, 1, 0, 1, 'linear');
    expect(d1).toBe(txt);
  });
});
