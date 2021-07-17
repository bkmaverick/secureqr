const { ipcRenderer } = require('electron')

const QRCode = require('qrcode');
let html5QrCode = null;

function changeScreen(screenNo) {
    $(".screen").hide();
    $(".hide-on-scan").show();
    $("#reader").hide();
    $("#encryptForm").show();
    $("#encryptQRWrap").hide();
    $("#screen" + screenNo).show();
    if (html5QrCode != null) html5QrCode.stop();
}

function encrypt() {
    var data = {};
    $("#encryptForm").validate();
    if ($("#encryptForm").valid()) {
        $("#encryptForm").serializeArray().forEach((v) => {
            data[v.name] = v.value;
        });
        var result = ipcRenderer.sendSync('encrypt', data);
        $("#encryptForm").hide();
        $("#encryptQRWrap").show();
        QRCode.toCanvas(document.getElementById('encryptQR'), result, function (error) {
            if (error) console.error(error);
        })
        return false;
    }
    return false;
}

function decrypt() {
    var data = {};
    $("#decryptForm").serializeArray().forEach((v) => {
        data[v.name] = v.value;
    });
    var result = ipcRenderer.sendSync('decrypt', data);
    $("#decrypted").val(result);
    return false;
}

function scannedQR(decodedText, decodedResult) {
    $("#scannedData").val(decodedText);
    html5QrCode.stop();
    $("#reader").hide();
    $(".hide-on-scan").show();
}

function saveQR() {
    var canvas = document.getElementById("encryptQR");
    canvas.toBlob((blob) => {
        blob.arrayBuffer().then(buffer => ipcRenderer.send('saveDialog', buffer));
    }, 'image/png');
}

function startScan() {
    $(".hide-on-scan").hide();
    $("#reader").show();
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 350 }, scannedQR);
    return false;
}

jQuery(function () {
    changeScreen(0);
});