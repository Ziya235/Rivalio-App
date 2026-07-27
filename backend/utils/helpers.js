export const parsePositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const teamSelect = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
  city: true,
  captainId: true,
};

export const userBriefSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  image: true,
};
