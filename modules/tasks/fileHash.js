const {parentPort, workerData, isMainThread} = require('worker_threads');
if (!isMainThread) {

    const fs = require('fs')
    const crypto = require('crypto')
    const sendMessage = (type, value) => {
        const msg = {type: type, value: value};
        parentPort.postMessage(msg);
    }

    let fileHash = [];

    const {files, hashType} = workerData;

    files.forEach(file => {
        try {
            sendMessage("StartCheck", {file: file})

            if (fs.existsSync(file)) {
                let handler = fs.readFileSync(file)
                let hash = crypto.createHash(hashType).update(handler).digest("hex");
                fileHash[file] = hash;
            }
            sendMessage("endCheck", {file: file})
        } catch (err) {
            sendMessage("errorCheck", {err: err, file: file})
        }
    });

    sendMessage("done", fileHash);
} else {
    console.warn('Why are you running me at Main Thread?');
}
