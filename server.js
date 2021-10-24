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

const userSchema = new Schema({
  username: String
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
    else done(null, user);
  })
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



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
