class BizError extends Error {
  constructor(message, code = "BIZ") {
    super(message);
    this.code = code;
    this.isBiz = true;
  }
}

function fail(message, code) {
  throw new BizError(message, code);
}

module.exports = { BizError, fail };
