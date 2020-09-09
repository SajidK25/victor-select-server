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
    name: "PrescriptionStatus",
    embedded: false
  },
  {
    name: "OrderStatus",
    embedded: false
  },
  {
    name: "PrescriptionType",
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
    name: "Interest",
    embedded: false
  },
  {
    name: "Product",
    embedded: false
  },
  {
    name: "Prescription",
    embedded: false
  },
  {
    name: "Order",
    embedded: false
  },
  {
    name: "CreditCard",
    embedded: false
  },
  {
    name: "Message",
    embedded: false
  },
  {
    name: "Discount",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `https://testserver-57c39de175.herokuapp.com/`,
  secret: `${process.env["PRISMA_SECRET"]}`
});
exports.prisma = new exports.Prisma();
