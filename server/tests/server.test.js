const expect = require('chai').expect;
const request = require('supertest');
const {ObjectID} = require('mongodb');

const {app} = require('./../server');
const {Todo} = require('./../models/todo');
const {User} = require('./../models/user');
const {todos, populateTodos, users, populateUsers} = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
  it('Should create a new todo', (done) => {
    let text = 'Test todo text';
    
    request(app)
      .post('/todos')
      .set('x-auth-token', users[0].tokens[0].token)
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
      .set('x-auth-token', users[0].tokens[0].token)
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
      .set('x-auth-token', users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body.length).to.equal(1);
      }).end(done);
  });
});

describe('GET /todos/:id', () => {
  it('Should return todo doc', done => {
    request(app)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .set('x-auth-token', users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body.text).to.be.equal(todos[0].text);
      })
      .end(done);
  });

  it('Should not return todo doc created by other user', done => {
    request(app)
      .get(`/todos/${todos[1]._id.toHexString()}`)
      .set('x-auth-token', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('Should return 404 if todo not found', done => {
    let hexId = new ObjectID().toHexString();
    request(app)
      .get(`/todos/${hexId}`)
      .set('x-auth-token', users[0].tokens[0].token)      
      .expect(404)
      .end(done);
  });

  it('Should return 404 for non-objects ids', done => {
    request(app)
      .get(`/todos/123`)
      .set('x-auth-token', users[0].tokens[0].token)      
      .expect(404)
      .end(done);
  });
});

describe('DELETE /todos/:id', () => {
  it('Should return 204 if todo successfully deleted', done => {
    let hexId = todos[1]._id.toHexString();
    request(app)
      .delete(`/todos/${hexId}`)
      .set('x-auth-token', users[1].tokens[0].token)
      .expect(204)
      .end((err, res) => {
        if (err) return done(err);

        Todo.findById(hexId).then(todo => {
          expect(todo).to.not.exist;
          done();
        }).catch(e => {
          return done(e);
        });
      });
  });

  it('Should return 404 when trying to update todo not owned by user', done => {
    let hexId = todos[0]._id.toHexString();
    request(app)
      .delete(`/todos/${hexId}`)
      .set('x-auth-token', users[1].tokens[0].token)
      .expect(404)
      .end((err, res) => {
        if (err) return done(err);

        Todo.findById(hexId).then(todo => {
          expect(todo).to.exist;
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
      .set('x-auth-token', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('Should return 404 for non-objects ids', (done) => {
    request(app)
      .delete(`/todos/123abc`)
      .set('x-auth-token', users[1].tokens[0].token)
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
      .set('x-auth-token', users[0].tokens[0].token)
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

  it('should not update todo not owned by user', done => {
    let hexId = todos[0]._id.toHexString();
    let text = 'Walk the dog';

    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth-token', users[1].tokens[0].token)
      .expect(404)
      .send({text, completed: true})
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        
        Todo.findById(hexId)
          .then(todo => {
            expect(todo.text).to.not.equal(text);
            expect(todo.completed).to.be.a('boolean')
              .to.not.equal(true);
            expect(todo.completedAt).to.be.null;
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
      .set('x-auth-token', users[0].tokens[0].token)
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
      .set('x-auth-token', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('Should return 404 for non exists ids', (done) => {
    let hexId = new ObjectID();
    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth-token', users[1].tokens[0].token)
      .expect(404)
      .end(done);
  });
});


describe('GET /users/me', () => {
  it('Should return user if authenticated', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth-token', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).to.be.equal(users[0]._id.toHexString());
        expect(res.body.email).to.be.equal(users[0].email);
      }).end(done);
  });

  it('Should return 401 token no provided', (done) => {
    request(app)
      .get('/users/me')
      .expect(401)
      .end(done);
  });

  it('Should return 401 if using invalid jwt', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth-token', 'abcd')
      .expect(401)
      .end(done);
  });

  it('Should return 401 with valid token but user not found', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1OGRkMWY2M2Q3N2M1MDAxOTA0NzBhYWYiLCJhY2Nlc3MiOiJhdXRoIiwiaWF0IjoxNDkwODg2NDk5fQ.YvXpoMRNE-Ppi_wIhONURCLphclRXFtT3vU7mC5ZwAs')
      .expect(401)
      .end(done);
  });
});


describe('POST /users', () => {
  
  it('Should create a user', (done) => {
    let email = 'example@example.com';
    let password = 'pass123!';

    request(app)
      .post('/users')
      .send({email, password})
      .expect(201)
      .expect((res) => {
        expect(res.headers['x-auth-token']).to.be.exist;
        expect(res.body._id).to.be.exist;
        expect(res.body.email).to.be.equal(email);
      })
      .end((err) => {
        if (err) return done(err);

        User.findOne({email}).then((user) => {
          expect(user).to.be.exist;
          expect(user.password).to.not.equal(password);
          done();
        }).catch((e) => done(e));
      });
    
  });

  it('Should return validation errors if request invalid', (done) => {
    request(app)
      .post('/users')
      .send({email: 'and', password: '123'})
      .expect(400)
      .end(done);
  });

  it('Should not create user if email in use', (done) => {
    request(app)
      .post('/users')
      .send({email: users[0].email, password: 'pass123!'})
      .expect(400)
      .end(done);
  });
});

describe('POST /users/login', () => {
  it('Should login user and return auth token', (done) => {
    request(app)
      .post('/users/login')
      .send({email: users[1].email, password: users[1].password})
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth-token']).to.be.exist;
      })
      .end((err, res) => {
        if (err) return done(err);
        User.findById(users[1]._id).then((user) => {
          expect(user.tokens[1]).to.include({
            'access': 'auth',
            'token': res.headers['x-auth-token']
          });
          done();
        }).catch((e) => done(e));
      });
  });

  it('Should reject invalid password login', (done) => {
    request(app)
      .post('/users/login')
      .send({email: users[1].email, password: users[1].password + 1})
      .expect(401)
      .expect((res) => {
        expect(res.headers['x-auth-token']).to.not.exist;
      })
      .end((err, res) => {
        if (err) return done(err);

        User.findById(users[1]._id).then((user) => {
          expect(user.tokens.length).to.equal(1)
          done();
        }).catch(e => done(e));
      });
  });

  it('Should reject invalid email login', (done) => {
    request(app)
      .post('/users/login')
      .send({email: 'r' + users[1].email, password: users[1].password + 1})
      .expect(401)
      .end(done);
  });
});

describe('DELETE /users/me/token', () => {
  it('Should remove auth token on logout', (done) => {
    request(app)
      .delete('/users/me/token')
      .set('x-auth-token', users[0].tokens[0].token)
      .expect(204)
      .end((err, res) => {
        if (err) done(err);
        User.findById(users[0]._id).then((user) => {
          expect(user.tokens.length).to.equal(0);
          done();
        }).catch(e => done(e));
      });
  });
});