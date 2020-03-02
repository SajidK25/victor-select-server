require("reflect-metadata");
require("dotenv").config();
const { ApolloServer } = require("apollo-server-express");
const { makeExecutableSchema } = require("graphql-tools");
const express = require("express");
const CookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { verify } = require("jsonwebtoken");
const { createAccessToken, createRefreshToken } = require("./auth");
const { importSchema } = require("graphql-import");
const { resolvers } = require("./resolvers");
const { directiveResolvers } = require("./directives");
const { prisma } = require("./generated/prisma-client");

var whitelist = [
  "http://localhost:3005",
  "http://localhost:3000",
  "https://http://physician-select.herokuapp.com"
];

let corsOptions = {
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true // <-- REQUIRED backend setting
};

(async () => {
  const app = express();
  app.use(cors(corsOptions));
  app.use(CookieParser());
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

  app.get("/", (_req, res) => res.send("Hello!"));

  app.post("/refresh_token", async (req, res) => {
    const token = req.cookies.jid;
    if (!token) {
      return res.send({ ok: false, accessTokens: "" });
    }

    let payload = null;
    try {
      payload = verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      console.log(err);
      return res.send({ ok: false, accessToken: "" });
    }
    // token is valid and
    // we can send back an access token
    const user = await prisma.user({ where: { id: payload.userId } });

    if (!user) {
      return res.send({ ok: false, accessToken: "" });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.send({ ok: false, accessToken: "" });
    }

    sendRefreshToken(res, createRefreshToken(user));

    return res.send({ ok: true, accessToken: createAccessToken(user) });
  });

  const schema = makeExecutableSchema({
    typeDefs: importSchema("./src/schema.graphql"),
    resolvers,
    directiveResolvers
  });

  const apolloServer = new ApolloServer({
    schema,
    //   context: req => ({ ...req, db })
    context: ({ req, res }) => ({ req, res, prisma })
  });

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:4444`);
  });
})();
