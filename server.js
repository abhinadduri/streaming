const host = "127.0.0.1";
const port = 3000;
const express = require('express');
const busboy = require('connect-busboy');
const bodyParser = require('body-parser');
const fs = require('fs');

var app = express();
require('express-ws')(app);
app.use('/', express.static(__dirname + '/'));
app.use(busboy());
app.use(bodyParser.json());
app.listen(port, host);

app.ws('/upload', function(ws, req) {
  let index = 0;
  let name = null;
  let lastMsg = null;
  ws.on('message', function(msg) {
    if (index == 0) {
      name = msg;
    } else {
      lastMsg = msg;
      fs.appendFileSync(name, msg);
    }
    index ++;
  });

  ws.on('close', function() {
    // console.log(lastMsg);
    console.log('closed')
  })
});

app.get('/download', function(req, res) {
  res.sendFile(__dirname + '/download.html');
})

app.get('/assets/download/:id', function(req, res) {
  res.sendFile(__dirname + '/' + req.params.id);
})

app.post('/upload', (req, res) => {
  req.pipe(req.busboy);
  req.busboy.on('file', (fieldname, file, filename) => {
    console.log(file)
  });
})