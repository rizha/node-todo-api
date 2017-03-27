const express = require('express')
  , bodyParser = require('body-parser')
  , {ObjectID} = require('mongodb');

const {mongose} = require('./db/mongoose')
  , {User} = require('./models/user')
  , {Todo} = require('./models/todo');


const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/todos', (req, res) => {

  let todo = new Todo({
    text: req.body.text
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

app.get('/todos', (req, res) => {
  let todos = Todo.find().then(todos => {
    res.send({
      results: todos,
      code: 200
    });
  }, e => {
    res.status(400).send(e);
  });
});

app.get('/todos/:id', (req, res) =>  {
  let id = req.params.id;
  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Todo.findById(id).then(todo => {
    if (!todo) {
      return res.status(404).send();
    }
    
    return res.send(todo);
  }).catch((e) => {
    return res.status(400).send(e);
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = {app};