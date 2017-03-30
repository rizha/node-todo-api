const {ObjectID} = require('mongodb')
  , jwt = require('jsonwebtoken');
const {Todo} = require('./../../models/todo')
  , {User} = require('./../../models/user');

let userOneId = new ObjectID();
let userTwoId = new ObjectID();

const users = [{
  _id: userOneId,
  email: 'rizha@example.com',
  password: 'userOnePass',
  tokens: [{
    access: 'auth',
    token: jwt.sign({
      _id: userOneId,
      access: 'auth'
    }, 'secretvalue').toString()
    
  }]
}, {
  _id: userTwoId,
  email: 'deglazed@example.com',
  password: 'userTwoPass',
  tokens: [{
    access: 'auth',
    token: jwt.sign({
      _id: userTwoId,
      access: 'auth'
    }, 'secretvalue').toString()
    
  }]
}];

const todos = [{
  _id: new ObjectID(),
  text: 'First test todo',
  _creator: userOneId
}, {
  _id: new ObjectID(),
  text: 'Second test todo',
  completed: true, 
  completedAt: 333,
  _creator: userTwoId
}];


const populateTodos = (done) => {
  Todo.remove({})
    .then(() => {
      return Todo.insertMany(todos);
    })
    .then(() => done())
    .catch((e) => {
      done(e);
    });
};

const populateUsers = (done) => {
  User.remove({}).then(() => {
    var userOne = new User(users[0]).save();
    var userTwo = new User(users[1]).save();
    
    return Promise.all([userOne, userTwo]);
  }).then(() => done());
};

module.exports = {todos, populateTodos, users, populateUsers};