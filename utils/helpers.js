exports.isHisStore = function (currentUser, productOwnerId) {
  return (
    currentUser.role === "admin" ||
    productOwnerId.toString() === currentUser._id.toString()
  );
};
