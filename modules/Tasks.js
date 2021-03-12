const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads')
//const cluster = require('cluster'); //Should be nice to have but a bit complicated now
const isDev = require('electron-is-dev');
//Instead use the file get file content and send it as eval data.
const UseShadowWorker = false; // This is a work-around
const Cache = [];

require('./tasks/fileHash');


function getWorkerPath(taskName) {
    //return path.resolve(__dirname, `tasks/${taskName}.js`);

    if(isDev){
        return path.resolve(__dirname, `tasks/${taskName}.js`)
    }else{
        return path.resolve(process.resourcesPath, 'app.asar.unpacked', `${taskName}.js`);
    }
}

function getWorker(taskName, workerData){
    if(UseShadowWorker){
        return shadowWorker(taskName,workerData);
    }else{
        return new Worker(getWorkerPath(taskName), {workerData});
    }
}

function shadowWorker(taskName,workerData){
    let data;
    if(Cache[taskName]){
        data = Cache[taskName];
    }else{
        //BUG: no load modules
        const filePath =  getWorkerPath(taskName);
        const buffer = fs.readFileSync(filePath,{encoding: 'utf8'});
        Cache[taskName] = data = buffer.toString('ascii', 0, buffer.length)

    }
    return new Worker(`${data}`, {eval: true, workerData: workerData, type: "module"})
}

function getFileHash(files,msgHandler){
    return new Promise((resolve, reject) => {
        const workerData = {cwd: "./", files:files,hashType: 'md5'};
        let worker = getWorker('fileHash', workerData);

        //console.info(`Starting Task FileCheck ${worker.threadId}`);
        worker.on('message', msg => {
            if(msg.type == "done"){
                resolve(msg.value)
            }
            if(typeof msgHandler == 'function'){
                msgHandler(msg);
            }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0)
                reject(new Error(`Checkfiles stopped with exit code ${code}`));
        })
    })

}

module.exports = {
    getFileHash: getFileHash
}
