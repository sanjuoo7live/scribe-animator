describe('lazy-loaded hand modals', () => {
  test('HandToolSelector is not imported when flag disabled', () => {
    let loaded = false;
    jest.isolateModules(() => {
      jest.mock('../../../components/hands/HandToolSelector', () => {
        loaded = true;
        return () => null;
      });
      require('../../../components/hands/lazy');
    });
    expect(loaded).toBe(false);
  });
});
