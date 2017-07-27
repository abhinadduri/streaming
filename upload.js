function upload(event) {
  const file = event.target.files[0];
  const size = file.size;
  const chunkSize = 64*1024*1024;
  const socket = new WebSocket('ws://localhost:3000/upload');
  let offset = 0;

  const eventHandler = function(readEvent) {
    if (readEvent.target.error == null) {
      offset += chunkSize;
      const result = readEvent.target.result;
      socket.send(result);
    } else {
      console.error(readEvent.target.error);
      return;
    }
    if (offset >= size) {
      socket.close();
      return;
    }
    readNextChunk(offset);
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