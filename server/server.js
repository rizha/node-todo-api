require('./config/config');

const express = require('express')
const bodyParser = require('body-parser')
const {ObjectID} = require('mongodb')
const _ = require('lodash');

const {mongose} = require('./db/mongoose');
const {User} = require('./models/user')
const {Todo} = require('./models/todo')
const {authenticate} = require('./middleware/authenticate');


const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.post('/todos', authenticate, (req, res) => {

  let todo = new Todo({
    text: req.body.text,
    _creator: req.user._id
  });

  todo.save().then((doc) => {
    res.status(201).send(doc);
  }, e => {
    res.status(400).send({
      message: 'Invalid JSON Format',
      details: e
    });
  });
});

app.get('/todos', authenticate, (req, res) => {
  let todos = Todo.find({
    _creator: req.user._id
  }).then(todos => {
    res.send(todos);
  });
});

app.get('/todos/:id', authenticate, (req, res) =>  {
  let id = req.params.id;
  
  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Todo.findOne({
    _id: id,
    _creator: req.user._id
  }).then(todo => {
    if (!todo) {
      return res.status(404).send();
    }
    
    res.send(todo);
  });
});

app.delete('/todos/:id', authenticate, (req, res) => {
  let id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }
  
  Todo.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  }).then(todo => {
    if (!todo) {
      return res.status(404).send();
    }
    res.status(204).send();
  });

});

app.patch('/todos/:id', authenticate, (req, res) => {
  let id = req.params.id;
  let body = _.pick(req.body, ['text', 'completed']);

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  Todo.findOneAndUpdate({
    _id: id,
    _creator: req.user._id
  }, {$set: body}, {new: true}).then(todo => {
    if (!todo) {
      return res.status(404).send();
    }
    res.status(201).send(todo);
  });
});

app.post('/users', (req, res) => {
  let body = _.pick(req.body, ['email', 'password']);
  let user = new User(body);

  user.save().then((user) => {
    return user.generateAuthToken();
  }).then((token) => {
    res
      .status(201)
      .header('x-auth-token', token)
      .send(user);
  }).catch((e) => {
    res.status(400).send(e);
  });
});

app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

app.post('/users/login', (req, res) => {
  let body = _.pick(req.body, ['email', 'password']);

  User.findByCredential(body.email, body.password).then((user) => {
    return user.generateAuthToken().then((token) => {
      res.header('x-auth-token', token).send(user);
    });
  }).catch((e) => {
    res.status(401).send();
  });
});

app.delete('/users/me/token', authenticate, (req, res) => {
 req.user.removeToken(req.token).then(() => {
   res.status(204).send();
 })
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = {app};