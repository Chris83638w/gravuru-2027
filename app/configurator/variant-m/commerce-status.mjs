// An error describes one submitted design, not every later edit or retry.
export function commerceStatus() {
  let failure = '', failedDesign = '';
  return {
    fail(message, design) { failure = message; failedDesign = design; },
    clear() { failure = ''; failedDesign = ''; },
    message(design) {
      if (design !== failedDesign) { failure = ''; failedDesign = ''; }
      return failure;
    }
  };
}
