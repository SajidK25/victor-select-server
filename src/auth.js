const { sign, verify } = require("jsonwebtoken");

const createAccessToken = user => {
  return sign(
    { userId: user.id, userRole: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "120min"
    }
  );
};

const createRefreshToken = user => {
  return sign(
    { userId: user.id, userRole: user.Role },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d"
    }
  );
};

const getAuthorizedUserId = req => {
  const authorization = req.headers["authorization"];
  if (!authorization) {
    return null;
  }

  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET);
    return payload;
  } catch (err) {
    console.log(err);
    return null;
  }
};

const validateUser = async (req, isAdmin = false) => {
  const payload = getAuthorizedUserId(req);

  if (!payload) {
    throw new Error("You must be logged in to do this");
  }

  if (
    isAdmin &&
    !(payload.userRole === "PHYSICIAN" || payload.userRole === "ADMIN")
  ) {
    throw new Error("Not allowed to run this operation");
  }

  return payload;
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  getAuthorizedUserId,
  validateUser
};
