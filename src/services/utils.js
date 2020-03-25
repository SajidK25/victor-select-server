const validateArgument = (arg, name) => {
  if (arg === null || arg === undefined) {
    throw new Error("Required argument missing: " + name);
  }
};

const throwInvalidDataError = res => {
  throw new Error("Invalid response data: " + JSON.stringify(res));
};

module.exports = { validateArgument, throwInvalidDataError };
