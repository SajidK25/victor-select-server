const validZips = [
  // New York
  { min: 10001, max: 14975 },
  { min: 6390, max: 6390 },
  // Texas
  { min: 73301, max: 73301 },
  { min: 75001, max: 75501 },
  { min: 75503, max: 79999 },
  { min: 88510, max: 88589 },
  { min: 92657, max: 92657 }
];

const validateZipcode = zipCode => {
  for (let i = 0; i < validZips.length; i++) {
    if (zipCode >= validZips[i].min && zipCode <= validZips[i].max) {
      return true;
    }
  }
  return false;
};

module.exports = { validateZipcode };
