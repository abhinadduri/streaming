async function upload(event) {
  const file = event.target.files[0];
  const size = file.size;
  const chunkSize = 64 * 1024 * 1024;
  const socket = new WebSocket('ws://localhost:3000/upload');
  const PRK = await generatePRK();
  // const key = await window.crypto.subtle.importKey(
  //   'raw', PRK, hmac, false, ['sign']
  // );
  let offset = 0;
  let index = 0;

  const eventHandler = async function(readEvent) {
    if (offset >= size) {
      socket.send(PRK)
      socket.close();
      return;
    }

    // don't use the nonce for now, just try to encrypt and decrypt using a hard coded iv
    if (readEvent.target.error == null) {
      offset += chunkSize;
      index += 1;
      // let nonce = await generateNonce(key, index);
      // console.log(new Uint8Array(nonce).toString());
      const result = readEvent.target.result;
      const pwUtf8 = new TextEncoder().encode('my password');
      const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8); 
      const iv = new Uint8Array([1,2,3,4,5,6,7,8,9,0,1,2]);
      const alg = { name: 'AES-GCM', iv: iv };
      const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']);
      const ctBuffer = await crypto.subtle.encrypt(alg, key, result);
      socket.send(ctBuffer);
      readNextChunk(offset);
    } else {
      console.error(readEvent.target.error);
      return;
    }
  }

  const readNextChunk = function(offset) {
    const fr = new FileReader(file);
    const blob = file.slice(offset, offset + chunkSize);
    fr.onload = eventHandler;
    fr.readAsArrayBuffer(blob);
  }

  socket.onopen = function() {
    socket.send(file.name);
    readNextChunk(offset);
  }
}

const uploadButton = document.getElementById('uploadFile');
uploadButton.addEventListener('change', upload);

function generateIKM() {
  return window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false,
    ['deriveBits']
  ).then(key => {
    return window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
        public: key.publicKey
      },
      key.privateKey,
      128
    )
  })
}

const hmac = { name: 'HMAC', hash: {name: 'SHA-256'} };
const UTF8 = new TextEncoder('utf-8');

function generatePRK() {
  return generateIKM().then(bits => {
    const salt = new Uint8Array([1,2,3,4,5,6,1,2,3,4,5,6,1,2,3,4]);//window.crypto.getRandomValues(new Uint8Array(16));
    const ikm = new Uint8Array([1,2,3,4,5,6,1,2,3,4,5,6,1,2,3,4]);
    
    return window.crypto.subtle.importKey(
      'raw',
      salt,
      hmac,
      false,
      ['sign']
    )
    .then(key => {
      return window.crypto.subtle.sign(
        { name: 'HMAC' },
        key,
        ikm
      )
    })
  })
}

async function generateNonce(key, i) {
  const NONCE_INFO = 'Content-Encoding: nonce';
  let currentNonce = await window.crypto.subtle.sign(
    {
      name: 'HMAC'
    },
    key,
    UTF8.encode(NONCE_INFO + i)
  );

  //   var base64 = btoa(
  // new Uint8Array(currentNonce)
  //   .reduce((data, byte) => data + String.fromCharCode(byte), '')
  // );
  // console.log(base64);
  console.log(new Uint8Array(currentNonce).toString())

  return currentNonce;
}