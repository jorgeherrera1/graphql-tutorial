const {makeExecutableSchema} = require('graphql-tools');
const resolvers = require('./resolvers');

const typeDefs = `
  type Link {
    id: ID!
    url: String!
    description: String!
    postedBy: User
    votes: [Vote]
  }

  type User {
    id: ID!
    name: String!
    email: String
    password: String
    votes: [Vote]
  }

  type Vote {
    id: ID!
    user: User!
    link: Link!
  }
  
  type SignInPayload {
    token: String
    user: User
  }

  input AuthProvider {
    email: String!
    password: String!
  }

  input LinkFilter {
    OR: [LinkFilter!]
    description_contains: String
    url_contains: String
  }

  type Query {
    allLinks(filter: LinkFilter, skip: Int, first: Int): [Link!]!
    allUsers: [User!]!
    allVotes: [Vote!]!
  }

  type Mutation {
    createLink(url: String!, description: String!): Link
    createUser(name: String!, authProvider: AuthProvider!): User
    signInUser(auth: AuthProvider): SignInPayload!
    createVote(linkId: ID!): Vote
  }

  type Subscription {
    Link(filter: LinkSubscriptionFilter): LinkSubscriptionPayload
  }

  input LinkSubscriptionFilter {
    mutation_in: [_ModelMutationType!]
  }
  
  type LinkSubscriptionPayload {
    mutation: _ModelMutationType!
    node: Link
  }
  
  enum _ModelMutationType {
    CREATED
    UPDATED
    DELETED
  }
`;

module.exports = makeExecutableSchema({typeDefs, resolvers});
