"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_lib_1 = require("prisma-client-lib");
var typeDefs = require("./prisma-schema").typeDefs;

var models = [
  {
    name: "Role",
    embedded: false
  },
  {
    name: "VisitStatus",
    embedded: false
  },
  {
    name: "PlanStatus",
    embedded: false
  },
  {
    name: "PlanType",
    embedded: false
  },
  {
    name: "User",
    embedded: false
  },
  {
    name: "Visit",
    embedded: false
  },
  {
    name: "Address",
    embedded: false
  },
  {
    name: "Plan",
    embedded: false
  },
  {
    name: "CreditCard",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `${process.env["PRISMA_ENDPOINT"]}`,
  secret: `${process.env["PRISMA_SECRET"]}`
});
exports.prisma = new exports.Prisma();
