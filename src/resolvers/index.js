const { Query } = require("./Query");
const { Mutation } = require("./Mutation");
const { User } = require("./User");
const { Visit } = require("./Visit");
const { Address } = require("./Address");
const { CreditCard } = require("./CreditCard");

const resolvers = {
  Mutation,
  Query,
  User,
  Visit,
  Address,
  CreditCard
};

module.exports = { resolvers };
