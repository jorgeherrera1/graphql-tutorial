const {ObjectID} = require('mongodb');
const {URL} = require('url');
const pubSub = require('../pub-sub');

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

function assertValidLink({url}) {
  try {
    new URL(url);
  } catch (error) {
    throw new ValidationError('Link validation error: invalid url.', 'url');
  }
}

function buildFilters({OR = [], description_contains, url_contains}) {
  const filter = (description_contains || url_contains) ? {} : null;
  if (description_contains) {
    filter.description = {$regex: `.*${description_contains}.*`};
  }
  if (url_contains) {
    filter.url = {$regex: `.*${url_contains}.*`};
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildFilters(OR[i]));
  }
  return filters;
}

module.exports = {
  Query: {
    allLinks: async (root, {filter, first, skip}, {mongo: {Links}}) => {
      let query = filter ? {$or: buildFilters(filter)} : {};
      const cursor = Links.find(query);
      if (first) {
        cursor.limit(first);
      }
      if (skip) {
        cursor.skip(skip);
      }
      return cursor.toArray();
    },
    allUsers: async (root, data, {mongo: {Users}}) => {
      return await Users.find().toArray();
    },
    allVotes: async (root, data, {mongo: {Votes}}) => {
      return await Votes.find().toArray();
    }
  },
  Mutation: {
    createLink: async (root, data, {mongo: {Links}, user}) => {
      assertValidLink(data);
      const newLink = Object.assign({postedById: user && user._id}, data);
      const response = await Links.insert(newLink);

      newLink.id = response.insertedIds[0];
      pubSub.publish('Link', {
        mutation: 'CREATED',
        node: newLink
      });

      return Object.assign({id: response.insertedIds[0]}, newLink);
    },
    createUser: async (root, data, {mongo: {Users}}) => {
      const newUser = {
        name: data.name,
        email: data.authProvider.email,
        password: data.authProvider.password
      };
      const response = await Users.insert(newUser);
      return Object.assign({id: response.insertedIds[0]}, newUser);
    },
    signInUser: async (root, data, {mongo: {Users}}) => {
      const user = await Users.findOne({email: data.auth.email});
      if (data.auth.password === user.password) {
        return {
          token: `token-${user.email}-${user.password}`,
          user: user
        };
      }
    },
    createVote: async (root, data, {mongo: {Votes}, user}) => {
      const newVote = {
        userId: user && user._id,
        linkId: ObjectID(data.linkId)
      };
      console.log('New Vote: ', newVote);

      const response = await Votes.insert(newVote);

      return Object.assign({id: response.insertedIds[0]}, newVote);
    }
  },
  Link: {
    id: root => root._id || root.id,
    postedBy: async ({postedById}, data, {dataloaders: {userLoader}}) => {
      return await userLoader.load(postedById);
    },
    votes: async ({_id}, data, {mongo: {Votes}}) => {
      return await Votes.find({linkId: _id}).toArray();
    }
  },
  User: {
    id: root => root._id || root.id,
    votes: async ({_id}, data, {mongo: {Votes}}) => {
      return await Votes.find({userId: _id}).toArray();
    }
  },
  Vote: {
    id: root => root._id || root.id,
    user: async ({userId}, data, {mongo: {Users}}) => {
      return await Users.findOne({_id: userId});
    },
    link: async ({linkId}, data, {mongo: {Links}}) => {
      return await Links.findOne({_id: linkId});
    }
  },
  Subscription: {
    Link: {
      subscribe: () => pubSub.asyncIterator('Link')
    }
  }
};
