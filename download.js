async function download() {
  let data = await fetchFile('assets/download/hello_world.txt');
  // console.log(data);
  // const PRK = await generatePRK();
  // const earlierkey = await window.crypto.subtle.importKey(
  //   'raw', PRK, hmac, false, ['sign']
  // );

  // let nonce = await generateNonce(key, 1);
  const pwUtf8 = new TextEncoder().encode('my password');
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  const iv = new Uint8Array([1,2,3,4,5,6,7,8,9,0,1,2]);
  const alg = { name: 'AES-GCM', iv: iv };
  const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);
  const ptBuffer = await crypto.subtle.decrypt(alg, key, data);
  const plaintext = new TextDecoder().decode(ptBuffer);
  console.log(plaintext)
}

function fetchFile(url) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.onload = function(event) {
      if (xhr.status === 404) {
        reject(new Error('notfound'));
        return;
      }

      const blob = new Blob([this.response]);
      const fileReader = new FileReader();
      fileReader.onload = function() {
        resolve(this.result);
      };

      fileReader.readAsArrayBuffer(blob);
    }

    xhr.open('get', url, true);
    xhr.responseType = 'blob';
    xhr.send();
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

  return currentNonce;
}

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

const downloadButton = document.getElementById('download');
downloadButton.addEventListener('click', download);