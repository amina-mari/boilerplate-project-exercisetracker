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
  date: {type: Date, default: Date.now}
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
      date: date
    })
  } else {
    exerciseToSave = new Exercise({
      userId: id,
      description: desc, 
      duration: time
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

function findLog(id, done){
  Log.find({userId: id}, function(err, log){
    if(err) return console.error(err);
    else done(null, log);
  })
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
        const dataFormatted = new Date(dateSplitted[0], dateSplitted[1], dateSplitted[2]);
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
                      "date": exercise.date.toDateString(),
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
                    "date": exercise.date.toDateString(),
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

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
