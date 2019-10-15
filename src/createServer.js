const { ApolloServer } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { verify } = require("jsonwebtoken");
const { createTokens } = require("./auth");
const { importSchema } = require("graphql-import");
const { resolvers } = require("./resolvers");
const { directiveResolvers } = require("./directives");
const { db } = require("./db");

const schema = makeExecutableSchema({
  typeDefs: importSchema("./src/schema.graphql"),
  resolvers,
  directiveResolvers
});

const startServer = async () => {
  const server = new ApolloServer({
    schema,
    context: req => ({ ...req, db })
  });

  const app = express();

  var corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true // <-- REQUIRED backend setting
  };

  // app.use(morgan("common"));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [
            "'self'",
            "data:",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
            "http://cdn.jsdelivr.net",
            "https://fonts.gstatic.com"
          ],
          styleSrc: [
            "'self'",
            `'unsafe-inline'`,
            "https://cdn.jsdelivr.net",
            "https://fonts.googleapis.com"
          ],
          scriptSrc: ["'self'", `'unsafe-inline'`, "https://cdn.jsdelivr.net"],
          reportUri: "/report-violation",
          objectSrc: ["'self'"],
          upgradeInsecureRequests: true
        },
        referrerPolicy: { policy: "same-origin" },
        featurePolicy: {}
      }
    })
  );
  app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
  app.use(cors(corsOptions));
  app.use(cookieParser());

  app.use(async (req, res, next) => {
    const refreshToken = req.cookies["refresh-token"];
    const accessToken = req.cookies["access-token"];
    if (!refreshToken && !accessToken) {
      return next();
    }

    try {
      const { userId } = verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      req.userId = userId;
      return next();
    } catch {}

    if (!refreshToken) {
      return next();
    }

    let data;
    try {
      data = verify(
        refreshToken,
        accessToken,
        process.env.REFRESH_TOKEN_SECRET
      );
    } catch {
      return next();
    }

    const user = await db.query.user(
      { where: { id: data.userId } },
      "{id, role, email, count, firstName, lastName}"
    );
    if (!user || user.count !== data.count) {
      return next();
    }
    const tokens = createTokens(user);

    res.cookie("refresh-token", tokens.refreshToken, { httpOnly: true });
    res.cookie("access-token", tokens.accessToken, { httpOnly: true });
    req.userId = user.id;
    req.user = user;
    next();
  });

  server.applyMiddleware({ app, path: "/", cors: false }); // app is from an existing express app

  app.listen(process.env.PORT, () =>
    console.log(`🚀 Server ready at http://localhost:4444${server.graphqlPath}`)
  );
};

module.exports = startServer;
