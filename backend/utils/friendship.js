export const canonicalPair = (userIdA, userIdB) => {
  const a = Number(userIdA);
  const b = Number(userIdB);
  return a < b ? [a, b] : [b, a];
};

export const areFriendsWhere = (userIdA, userIdB) => {
  const [user1Id, user2Id] = canonicalPair(userIdA, userIdB);
  return { user1Id, user2Id };
};
