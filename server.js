const path = require('path')
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config({
  path: path.join(__dirname, ".env")
})
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const {Schema} = mongoose;

/* ************ Database configuration ************ */

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

/* ******* User ******* */

const userSchema = new Schema({
  username: {type: String, required: true}
})

const User = mongoose.model('User', userSchema);

function findUser(id, done){
  User.findById(id, function(err, user){
    if(err) return console.error(err);
    else done(null, user);
  })
}

function findAllUsers(done){
  User.find({}, function(err, users){
    if(err) return console.error(err);
    else done(null, users);
  })
}

function saveUser(name, done){
  const userToSave = new User({
    username: name
  });
  userToSave.save(function(err, user){
    if(err) return console.error(err);
    else {
      saveLog(user._id, function(err, log){
        if(err) return console.error(err);
        else done(null, user);
      });
    }
  })
}

/* ******* Exercise ******* */

const exerciseSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, ref:'User', required: true},
  description: {type: String, required: true},
  duration: {type: Number, min: 1, required: true},
  date: {type: String},
  dateObject: {type: Date}
})

const Exercise = mongoose.model('Exercise', exerciseSchema);

function findUserByExercise(exerciseId, done){
  Exercise.findOne({_id: exerciseId})
    .populate('userId')
    .exec(function(err, exercise){
      if(err) return console.error(err);
      else done(null, exercise);
    })
}

function saveExercise(id, desc, time, date, done){
  let exerciseToSave;
  if(date){
    exerciseToSave = new Exercise({
      userId: id,
      description: desc, 
      duration: time,
      date: date.toDateString(),
      dateObject: date
    })
  } else {
    let dateNow = new Date(Date.now());
    let dateNowString = dateNow.toDateString();
    
    exerciseToSave = new Exercise({
      userId: id,
      description: desc, 
      duration: time,
      date: dateNowString,
      dateObject: dateNow
    })
  }
  exerciseToSave.save(function(err, exercise){
    if(err) return console.error(err);
    else {
      findAndUpdateLog(exercise, id, function(err, updatedLog){
        if(err) return console.error(err);
        else done(null, exercise);
      })
    }
  })
}

/* ******* Log ******* */

const logSchema = new Schema({
  count: {type: Number},
  userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  log: [{type: Schema.Types.ObjectId, ref: 'Exercise'}]
});

const Log = mongoose.model('Log', logSchema);

function filterLog(from, to, lim, id, done){
  let limit;
  let dateFrom;
  let dateTo;

  if(!lim) limit = 0;
  if(from && to){
    Log.findOne({userId: id})
      .populate({
        path: 'log',
        match: {
          dateObject: {
            $gte: from,
            $lt: to
          }
        },
        options: {
          limit: lim
        },
        select: '-_id -userId -__v -dateObject'
      })
      .populate('userId')
      .exec(function(err, log){
        if(err) return console.error(err);
        else return done(null, log);
      })
  } else if(from) {
    Log.findOne({userId: id})
      .populate({
        path: 'log',
        match: {
          dateObject: {
            $gte: from
          }
        },
        options: {
          limit: lim
        },
        select: '-_id -userId -__v -dateObject'
      })
      .populate('userId')
      .exec(function(err, logs){
        if(err) return console.error(err);
        else return done(null, logs);
      })
  } else if(to){
    Log.findOne({userId: id})
      .populate({
        path: 'log',
        match: {
          dateObject: {
            $lt: to
          }
        },
        options: {
          limit: lim
        },
        select: '-_id -userId -__v -dateObject'
      })
      .populate('userId')
      .exec(function(err, log){
        if(err) return console.error(err);
        else return done(null, log);
      })
  }
}

function findLog(id, done){
  Log.findOne({userId: id})
    .populate('userId')
    .populate({
      path: 'log',
      select: '-_id -userId -__v -dateObject'
    })
    .exec(function(err, log){
      if(err) return console.error(err);
      else done(null, log);
    });
}

function saveLog(id, done){
  const logToSave = new Log({
    userId: id, 
    log: [],
    count: 0
  })

  logToSave.save(function(err, log){
    if(err) return console.error(err);
    else done(null, log);
  })
};

function findAndUpdateLog(exercise, id, done){
  Log.findOne({userId: id}, function(err, findedLog){
    if(err) return console.log(err);
    else {
      findedLog.log.push(exercise._id);
      findedLog.count++;

      findedLog.save(function(err, updatedLog){
        if(err) return console.error(err);
        else done(null, updatedLog);
      })
    }
  })
}

/* ************ ************ */

function checkQueryParams(from, to, lim){
  let dateFrom = new Date(2000, 01, 01);
  let dateTo = new Date(2000, 01, 01);
  let limit = 1;

  if(from){
    const dateFromSplitted = from.split('-');
    dateFrom = new Date(dateFromSplitted[0], (dateFromSplitted[1] - 1), dateFromSplitted[2]);
  }
  if(to){
    const dateToSplitted = to.split('-');
    dateTo = new Date(dateToSplitted[0], (dateToSplitted[1] - 1), dateToSplitted[2]);
  }
  if(lim){
    limit = lim;
  }

  if(Date.parse(dateFrom) && Date.parse(dateTo) && (limit % 1 === 0)) return true;
  else return false;
}

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.route("/api/users")
  .post(function(req, res){
    saveUser(req.body.username, function(err, user){
      if(err) return console.error(err);
      else res.json({"username": user.username, "_id": user._id});
    })
  })
  .get(function(req, res){
    findAllUsers(function(err, users){
      if(err) return console.error(err);
      else res.json(users);
    })
  })

app.post("/api/users/:id/exercises", function(req, res){
  findUser(req.params.id, function(err, user){
    if(err) {
      res.json({"error": "user not found"});
      return console.error(err);
    }
    else {
      if(req.body.date){
        const dateSplitted = req.body.date.split('-');
        const dataFormatted = new Date(dateSplitted[0], (dateSplitted[1] - 1), dateSplitted[2]);
        if(Date.parse(dataFormatted)){
          saveExercise(req.params.id, 
            req.body.description, 
            req.body.duration, 
            dataFormatted, 
            function(err, exercise){
              if(err) return console.error(err);
              else {
                let username;
                findUserByExercise(exercise._id, function(err, findedExercise){
                  if(err) return console.error(err);
                  else {
                    username = findedExercise.userId.username;
                    res.json({
                      "_id": exercise.userId,
                      "username": username,
                      "date": exercise.date,
                      "duration": exercise.duration,
                      "description": exercise.description
                    })
                  } 
                });
              }
            });
        } else res.json({"error": "invalid date"});
      } else {
        saveExercise(req.params.id, 
          req.body.description, 
          req.body.duration, 
          null, 
          function(err, exercise){
            if(err) return console.error(err);
            else {
              let username;
              findUserByExercise(exercise._id, function(err, findedExercise){
                if(err) return console.error(err);
                else {
                  username = findedExercise.userId.username;
                  res.json({
                    "_id": exercise.userId,
                    "username": username,
                    "date": exercise.date,
                    "duration": exercise.duration,
                    "description": exercise.description
                  })
                } 
              });
            }
          });
      }
    }
  })
})

app.get("/api/users/:id/logs", function(req, res){
  if(!(req.query.from) && !(req.query.to) && !(req.query.limit)){
    findLog(req.params.id, function(err, log){
      if(err) {
        res.json({"error": "user not found"});
        return console.error(err);
      } else {
        res.json({
          "_id": log.userId._id,
          "username": log.userId.username,
          "count": log.count,
          "log": log.log
        });
      }
    })
  } else {
    if(checkQueryParams(req.query.from, req.query.to, req.query.limit)){
      filterLog(req.query.from, req.query.to, req.query.limit, req.params.id, function(err, log){
        if(err) {
          res.json({"error": "something go wrong"});
          return console.error(err);
        }
        else {
          res.json({
            "_id": log.userId._id,
            "username": log.userId.username,
            "count": log.count,
            "log": log.log
          });
        }
      })
    } else {
      res.json({"error": "invalid query parameters"});
    }
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
