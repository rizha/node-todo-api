const expect = require('chai').expect
  , request = require('supertest')
  , {ObjectID} = require('mongodb');

const {app} = require('../server');
const {Todo} = require('../models/todo');

const todos = [{
  _id: new ObjectID(),
  text: 'First test todo',
}, {
  _id: new ObjectID(),
  text: 'Second test todo',
  completed: true, 
  completedAt: 333
}];

beforeEach((done) => {
  Todo.remove({})
    .then(() => {
      return Todo.insertMany(todos);
    })
    .then(() => done())
    .catch((e) => {
      done(e);
    });
});

describe('POST /todos', () => {
  it('Should create a new todo', (done) => {
    let text = 'Test todo text';
    
    request(app)
      .post('/todos')
      .send({text})
      .expect(201)
      .expect((res) => {
        expect(res.body.text).to.equal(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Todo.find({text}).then(todo => {
          expect(todo.length).to.equal(1);
          expect(todo[0].text).to.equal(text);
          done();
        }).catch((e) => done(e));
      });
  });

  it('Should not create todo with invalid body data', done => {
    request(app)
      .post('/todos')
      .send()
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Todo.find().then(todo => {
          expect(todo.length).to.equal(2);
          done();
        }).catch(e => done(e));
      });
  });
});

describe('GET /todos', () => {
  it('Should get all todos', done => {
    request(app)
      .get('/todos')
      .expect(200)
      .expect(res => {
        expect(res.body.results.length).to.equal(2);
      }).end(done);
  });
});

describe('GET /todos/:id', () => {
  it('Should return todo doc', done => {
    request(app)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .expect(200)
      .expect(res => {
        expect(res.body.text).to.be.equal(todos[0].text);
      })
      .end(done);
  });

  it('Should return 404 if todo not found', done => {
    let hexId = new ObjectID().toHexString();
    request(app)
      .get(`/todos/${hexId}`)
      .expect(404)
      .end(done);
  });

  it('Should return 404 for non-objects ids', done => {
    request(app)
      .get(`/todos/123`)
      .expect(404)
      .end(done);
  });
});

describe('DELETE /todos/:id', () => {
  it('Should return 204 if todo successfully deleted', done => {
    let hexId = todos[0]._id.toHexString();
    request(app)
      .delete(`/todos/${hexId}`)
      .expect(204)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Todo.findById(hexId).then(todo => {
          console.log(todo);
          expect(todo).to.be.null;
          done();
        }).catch(e => {
          return done(e);
        });
      });
  });

  it('Should return 404 if todo id not found', done => {
    let hexId = new ObjectID().toHexString();
    request(app)
      .delete(`/todos/${hexId}`)
      .expect(404)
      .end(done);
  });

  it('Should return 404 for non-objects ids', (done) => {
    request(app)
      .delete(`/todos/123abc`)
      .expect(404)
      .end(done);
  });

});

describe('PATCH /todos/:id', () => {
  it('should update the todo', done => {
    let hexId = todos[0]._id.toHexString();
    let text = 'Walk the dog';

    request(app)
      .patch(`/todos/${hexId}`)
      .expect(201)
      .send({text, completed: true})
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        
        Todo.findById(hexId)
          .then(todo => {
            expect(todo.text).to.be.equal(text);
            expect(todo.completed).to.be.a('boolean')
              .equal(true);
            expect(todo.completedAt).to.be.a('number');
            done();
          }).catch(e => {
            return done(e);
          });
      });
  });

  it('should clear completedAt when todo is not completed', done => {
    let hexId = todos[0]._id.toHexString();
    let text = 'Walk the dog';

    request(app)
      .patch(`/todos/${hexId}`)
      .expect(201)
      .send({text})
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        
        Todo.findById(hexId)
          .then(todo => {
            expect(todo.text).to.be.equal(text);
            expect(todo.completed).to.be.false;;
            expect(todo.completedAt).to.be.null;
            done();
          }).catch(e => {
            return done(e);
          });
      });
  });

  it('Should return 404 for non-objects ids', (done) => {
    request(app)
      .patch(`/todos/123abc`)
      .expect(404)
      .end(done);
  });

  it('Should return 404 for non-objects ids', (done) => {
    request(app)
      .patch(`/todos/123abc`)
      .expect(404)
      .end(done);
  });
});