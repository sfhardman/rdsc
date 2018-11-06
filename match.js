const findMismatches = (expected, actual, errors, path) => {
  if (expected !== actual) {
    if (expected instanceof Array) {
      if (expected.length !== actual.length) {
        errors.push(`${path} expected length ${expected.length} got ${actual.length}`);
      } else {
        for (let i = 0; i < expected.length; i++) {
          const extPath = `${path}[${i}]`;
          const matchedActual = actual.find(item => {
            const tempErrors = [];
            findMismatches(expected[i], item, tempErrors, extPath);
            return !tempErrors.length;
          });
          if (!matchedActual) {
            errors.push(`${extPath} expected ${JSON.stringify(expected[i])}, not found in actual array`);
          }
        }
      }
    } else if (expected instanceof Object) {
      for (let key of Object.keys(expected)) {
        const extPath = path ? path + `.${key}` : key;
        findMismatches(expected[key], actual[key], errors, extPath);
      }
    } else {
      errors.push(`${path} expected ${expected} got ${actual}`);
    }
  }
}

const match = (expected, actual) => {
  const errors = []
  findMismatches(expected, actual, errors, '');
  if (errors.length) {
    throw new Error(errors.join('\n'));
  } else {
    return true;
  }
}

module.exports = match;