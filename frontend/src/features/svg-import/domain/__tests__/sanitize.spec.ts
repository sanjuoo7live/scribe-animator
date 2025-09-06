import { sanitize } from '../sanitize';

test('removes scripts, foreignObject, and unsafe attributes', () => {
  const dirty =
    '<svg><script>alert(1)</script><foreignObject><div/></foreignObject><rect onclick="alert(1)" href="http://evil.com" /></svg>';
  const clean = sanitize(dirty);
  expect(clean).not.toMatch(/script/);
  expect(clean).not.toMatch(/foreignObject/);
  expect(clean).not.toMatch(/onclick/);
  expect(clean).not.toMatch(/http:\/\/evil.com/);
});
