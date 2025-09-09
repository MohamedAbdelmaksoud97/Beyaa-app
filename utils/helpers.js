exports.isHisStore = function (currentUser, productOwnerId) {
  if (!productOwnerId || !currentUser) return false;
  console.log("====", currentUser, productOwnerId);
  return (
    currentUser.role === "admin" ||
    productOwnerId.toString() === currentUser.toString()
  );
};
