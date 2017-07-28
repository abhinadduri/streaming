var ece = require('http_ece');
var crypto = require('crypto');
var base64 = require('base64url');

var parameters = {
  key: base64.encode(Buffer.from([0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef])),
  salt: base64.encode(Buffer.from([1,2,3,4,5,6,1,2,3,4,5,6,1,2,3,4]))
};

const data = new Buffer('hello, world!', 'utf8');

var encrypted = ece.encrypt(data, parameters);


var decrypted = ece.decrypt(encrypted, parameters);

console.log(decrypted.toString('utf8'))

require('assert').equal(decrypted.compare(data), 0);