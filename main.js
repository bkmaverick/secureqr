const { app, BrowserWindow, dialog } = require('electron');
const _ = require('underscore');
const path = require('path');
const { ipcMain } = require('electron')
const { performance } = require('perf_hooks');
const fs = require('fs');

let crypto;
try {
    crypto = require('crypto');
} catch (err) {
    console.log('crypto support is disabled!');
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        backgroundColor: '#00102f'
    })
    mainWindow.loadFile('index.html')
    mainWindow.setMenuBarVisibility(false)
    //mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})



ipcMain.on('encrypt', (event, arg) => {
    const algorithm = 'aes-256-cbc';
    var iv = crypto.randomBytes(16).toString("base64");
    var salt = crypto.randomBytes(32).toString("base64");
    crypto.pbkdf2(
        arg.pass,
        salt,
        500000,
        32,
        "sha256",
        function (err, key) {
            if (err) console.los(err);
            else {
                var key = key.toString("base64");
                var encrypted = encrypt(arg.text, key, iv);
                var result = salt + ":" + iv + ":" + encrypted;
                event.returnValue = result;
            }
        }
    )
})

ipcMain.on('decrypt', (event, arg) => {
    const algorithm = 'aes-256-cbc';
    var salt = arg.scannedData.split(":")[0];
    var iv = arg.scannedData.split(":")[1];
    var data = arg.scannedData.split(":")[2]
    crypto.pbkdf2(
        arg.password,
        salt,
        500000,
        32,
        "sha256",
        function (err, key) {
            if (err) {
                console.los(err);
                event.returnValue = "Failed to decrypt";
            } else {
                try {
                    var key = key.toString("base64");
                    var decrypted = decrypt(data, key, iv);
                    event.returnValue = decrypted;
                } catch (e) {
                    console.log(e);
                    event.returnValue = "Failed to decrypt";
                }
            }
        }
    )
})

ipcMain.on("saveDialog", (event, arg) => {
    dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
        title: 'Download to File…',
        defaultPath: 'QR.png',
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    }).then((filename) => {
        var buffer = Buffer.from(arg);
        fs.writeFile(filename.filePath, buffer, (err) => {
            let options = { buttons: ['Close'] };
            if (err) {
                options = _.extend(options, {
                    title: 'Download Error',
                    type: 'error',
                    message: err.name || 'Export Error',
                    detail: err.toString()
                });
            } else {
                options = _.extend(options, {
                    title: 'Download Success',
                    type: 'info',
                    message: `Saved to ${filename.filePath}`
                });
            }
            dialog.showMessageBox(BrowserWindow.getFocusedWindow(), options);
            return null;
        });
    });
});

function encrypt(text, key, iv) {
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, "base64"), Buffer.from(iv, "base64"));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString("base64");
}

function decrypt(text, key, iv) {
    let encryptedText = Buffer.from(text, "base64");
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, "base64"), Buffer.from(iv, "base64"));
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}