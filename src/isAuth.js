import { verify } from "jsonwebtoken";

// bearer 102930ajslkdaoq01

export const isAuth = ({ context }, next) => {
  const authorization = context.req.headers["authorization"];

  console.log("AUTH:", authorization);

  if (!authorization) {
    throw new Error("not authenticated");
  }

  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET);
    context.payload = payload;
  } catch (err) {
    console.log(err);
    throw new Error("not authenticated");
  }

  return next();
};
