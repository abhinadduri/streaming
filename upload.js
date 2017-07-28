async function upload(event) {
  const file = event.target.files[0];
  const size = file.size;
  const chunkSize = 64 * 1024 * 1024;
  const socket = new WebSocket('ws://localhost:3000/upload');
  // use hardcoded values for testing
  const ikm = new Uint8Array([0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef,0xde,0xad,0xbe,0xef]);
  const salt = new Uint8Array([1,2,3,4,5,6,1,2,3,4,5,6,1,2,3,4]);
  const prk = await HKDF_extract(salt, ikm)
  let offset = 0;
  let index = 0;

  const eventHandler = async function(readEvent) {
    if (offset >= size) {
      socket.send(prk)
      socket.close();
      return;
    }

    if (readEvent.target.error == null) {
      offset += chunkSize;
      const result = readEvent.target.result;
      const [rawKey, nonce] = await generateNonce(prk, index);
      const alg = { name: 'AES-GCM', iv: nonce };
      const key = await crypto.subtle.importKey('raw', rawKey, alg, false, ['encrypt']);
      const encrypted = await crypto.subtle.encrypt(alg, key, result);
      index += 1;
      socket.send(encrypted);
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

async function generateNonce(prk, index) {
  return new Promise(async (resolve, reject) => {
    const k = await HDKF_expand(prk, UTF8.encode('Content-Encoding: aes128gcm' + String.fromCharCode(index)), 16);
    const nonce = await HDKF_expand(prk, UTF8.encode('Content-Encoding: nonce' + String.fromCharCode(index)), 12);
    resolve([k, nonce]);
  });
}