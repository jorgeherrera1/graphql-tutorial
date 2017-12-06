const {Logger, MongoClient} = require('mongodb');

const MONGO_URL = 'mongodb://admin:admin@ds145800.mlab.com:45800/hackernews';

module.exports = async () => {
  const db = await MongoClient.connect(MONGO_URL);
  
  let logCount = 0;
  Logger.setCurrentLogger((msg, state) => {
    console.log(`MONGO DB REQUEST ${++logCount}: ${msg}`);
  });
  Logger.setLevel('debug');
  Logger.filter('class', ['Cursor']);

  return {
    Links: db.collection('links'),
    Users: db.collection('users'),
    Votes: db.collection('votes')
  };
};
