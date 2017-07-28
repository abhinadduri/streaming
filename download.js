async function download() {
  let data = await fetchFile('assets/download/hello_world.txt');
  console.log(new TextDecoder().decode(data));
  const ikm = new Uint8Array([0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef]);
  const salt = new Uint8Array([1,2,3,4,5,6,1,2,3,4,5,6,1,2,3,4]);
  const prk = await HKDF_extract(salt, ikm);
  // only deal with one chunk for now
  const [rawKey, nonce] = await deriveKeyAndNonce(prk, 0);
  const alg = { name: 'AES-GCM', iv: nonce };
  const key = await crypto.subtle.importKey('raw', rawKey, alg, false, ['encrypt']);
  const decrypted = await crypto.subtle.decrypt(alg, key, data);
  const plaintext = new TextDecoder().decode(decrypted);
  // const pwUtf8 = new TextEncoder().encode('my password');
  // const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  // const iv = new Uint8Array([1,2,3,4,5,6,7,8,9,0,1,2]);
  // const alg = { name: 'AES-GCM', iv: iv };
  // const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);
  // const ptBuffer = await crypto.subtle.decrypt(alg, key, data);
  // const plaintext = new TextDecoder().decode(ptBuffer);
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

const HMAC_SHA256 = { name: 'HMAC', hash: {name: 'SHA-256'}};
const UTF8 = new TextEncoder('utf-8');

function b64(arrayBuffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
}

function concatArray(arrays) {
  var size = arrays.reduce((total, a) => total + a.byteLength, 0);
  var index = 0;
  return arrays.reduce((result, a) => {
    result.set(new Uint8Array(a), index);
    index += a.byteLength;
    return result;
  }, new Uint8Array(size));
}

function HMAC(key) {
  return window.crypto.subtle.importKey(
    'raw',
    key,
    HMAC_SHA256,
    false,
    ['sign']
  )
}

async function HMAC_hash(key, input) {
  const hmac = await HMAC(key);
  return window.crypto.subtle.sign('HMAC', hmac, input)
}

async function HKDF_extract(salt, ikm) {
  return HMAC_hash(salt, ikm);
}

async function HDKF_expand(prk, info, l) {
  const input = concatArray([info, new Uint8Array([1])]);
  const h = await HMAC_hash(prk, input);
  return h.slice(0, l);
}

async function HKDF(salt, ikm, info, len) {
  const x = await HKDF_extract(salt, ikm);
  return HKDF_expand(x, info, len);
}

async function deriveKeyAndNonce(prk, index) {
  return new Promise(async (resolve, reject) => {
    const k = await HDKF_expand(prk, UTF8.encode('Content-Encoding: aes128gcm' + String.fromCharCode(index)), 16);
    const nonce = await HDKF_expand(prk, UTF8.encode('Content-Encoding: nonce' + String.fromCharCode(index)), 12);
    resolve([k, nonce]);
  });
}

const downloadButton = document.getElementById('download');
downloadButton.addEventListener('click', download);