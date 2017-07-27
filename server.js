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
  ws.on('message', function(msg) {
    if (index == 0) {
      name = msg;
    } else {
      console.log(index);
      fs.appendFileSync(name, msg);
    }
    index ++;
  });

  ws.on('close', function() {
    console.log('closed')
  })
});

app.post('/upload', (req, res) => {
  req.pipe(req.busboy);
  req.busboy.on('file', (fieldname, file, filename) => {
    console.log(file)
  });
})