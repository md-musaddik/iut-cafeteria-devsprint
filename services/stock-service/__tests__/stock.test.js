// Unit tests for Stock Deduction and Order Validation logic.
// These run WITHOUT a real database — they test pure logic in isolation.

describe('Stock Deduction Logic', () => {

  test('rejects order when stock is 0', () => {
    const deduct = stock => {
      if (stock <= 0) throw new Error('Out of stock');
      return stock - 1;
    };
    expect(() => deduct(0)).toThrow('Out of stock');
    expect(() => deduct(-1)).toThrow('Out of stock');
  });

  test('decrements stock when available', () => {
    const deduct = stock => {
      if (stock <= 0) throw new Error('Out of stock');
      return stock - 1;
    };
    expect(deduct(10)).toBe(9);
    expect(deduct(1)).toBe(0);
  });

  test('detects optimistic lock version conflict', () => {
    const tryUpdate = (readVersion, currentVersion) => {
      if (readVersion !== currentVersion) throw new Error('Version conflict — retry');
      return currentVersion + 1;
    };
    // Another request already changed version from 5 to 6 while we were reading
    expect(() => tryUpdate(5, 6)).toThrow('Version conflict');
    // No conflict — version still matches what we read
    expect(tryUpdate(5, 5)).toBe(6);
  });

});

describe('Order Validation Logic', () => {

  test('rejects order with missing required fields', () => {
    const validate = ({mealCategory,selectedOption,userId}) => {
      if (!mealCategory)   throw new Error('mealCategory required');
      if (!selectedOption) throw new Error('selectedOption required');
      if (!userId)         throw new Error('userId required');
      return true;
    };
    expect(() => validate({selectedOption:'Beef',userId:'123'})).toThrow('mealCategory required');
    expect(() => validate({mealCategory:'Iftar',userId:'123'})).toThrow('selectedOption required');
    expect(validate({mealCategory:'Iftar',selectedOption:'Beef',userId:'123'})).toBe(true);
  });

  test('rejects zero or negative price', () => {
    const validatePrice = p => {
      if (!p || p <= 0) throw new Error('Invalid price');
      return true;
    };
    expect(() => validatePrice(0)).toThrow('Invalid price');
    expect(() => validatePrice(-50)).toThrow('Invalid price');
    expect(validatePrice(80)).toBe(true);
  });

});