// importing
const express = require('express');
const mongoose = require('mongoose');
const Messages = require('./dbMessages.js');
const Pusher = require('pusher');
const cors = require('cors');

// app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: process.env.pusher_appId,
  key: process.env.pusher_key,
  secret: process.env.pusher_secret,
  cluster: "eu",
  useTLS: true
});

// middleware
app.use(express.json());
app.use(cors());

/**app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
})*/

// DB config
//const connection_url = process.env.NODE_ENV == 'development' ? "mongodb://localhost/whatsapp-clone" : "mongodb-connection-string";

mongoose.connect(process.env.connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected...'))
  .catch((err) => console.log(err));

const db = mongoose.connection;

db.once('open', ()=>{
  console.log("DB connected");

  const msgCollection = db.collection('messagecontents');
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change)=>{
    console.log("A Change occured", change);

    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      pusher.trigger('messages', 'inserted',
        {
          name: messageDetails.name,
          message: messageDetails.message,
          timestamp: messageDetails.timestamp,
          received: messageDetails.received

        }
      );
    } else {
      console.log('Error triggering Pusher')
    }
  })
})

// api routes
app.get('/', (req, res) => res.status(200).send('hello world'));

app.get('/messages/sync', (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err)
    } else {
      res.status(200).send(data)
    }
  })
})

app.post("/messages/new", (req, res) => {
  const dbMessage= req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err)
    } else {
      res.status(201).send(data)
    }
  })
})

// listen
app.listen(port, ()=>console.log(`Listening on localhost:${port}`))