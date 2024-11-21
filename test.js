const PubNub = require('pubnub');

module.exports.OnePay = class OnePay {
    constructor(mcid) {
        this.mcid = mcid;
        this.tid = null;
        this.shopcode = null;
        this.uuid = null;
        this.lastToken = new Date().getTime() - 30 * 60 * 1000 + "0000";
        this.debug = false;
        this.onpaid = null;
        this.qrcode = null;
        this.pubnub = null;

        this.mcc = null;
        this.ccy = 418;
        this.province = 'LA';
        this.country = 'VTE';
    }

    pubnubSubscribe() {
        const channel = this.tid && this.shopcode
            ? `tid-${this.mcid}-${this.shopcode}-${this.tid}`
            : this.shopcode
                ? `mcid-${this.mcid}-${this.shopcode}`
                : `uuid-${this.mcid}-${this.uuid}`;

        if (this.debug) console.log('Subscribing to channel:', channel);

        this.pubnub.subscribe({
            channels: [channel],
            timetoken: this.lastToken,
        });
    }

    paymentCallback(res) {
        if (this.onpaid) this.onpaid(res);
        this.onpaid = null; // Stop receiving additional callback
        this.pubnub.unsubscribeAll();
    }

    stop() {
        this.pubnub.unsubscribeAll();
    }

    async subscribe(params, onpaid) {
        if (this.debug) console.log("Subscribe parameters:", params);

        if (this.onpaid !== null) {
            throw new Error("You have already subscribed. Please wait until payment is completed to subscribe again, or create a new OnePay object.");
        }

        this.uuid = params.uuid;
        this.tid = params.tid || null;
        this.shopcode = params.shopcode || null;
        this.onpaid = onpaid;

        this.pubnub = new PubNub({
            subscribeKey: 'sub-c-91489692-fa26-11e9-be22-ea7c5aada356',
            uuid: 'BCELBANK',
            ssl: true,
        });

        this.pubnub.addListener({
            status: (statusEvent) => {
                if (statusEvent.category === "PNConnectedCategory") {
                    if (this.debug) console.log("PubNub connected.");
                    this.pubnubSubscribe();
                }
            },
            message: (messageEvent) => {
                if (this.debug) console.log("Message received:", messageEvent.message);
                const callback = JSON.parse(messageEvent.message);
                this.paymentCallback(callback);
            },
            presence: (presenceEvent) => {
                if (this.debug) console.log("Presence event:", presenceEvent);
            },
        });

        this.pubnubSubscribe();
    }

    payCode(res) {
        if (this.qrcode) this.qrcode(res);
    }

    getCode(params, qrcode) {
        if (this.debug) console.log("Get code parameters:", params);

        this.qrcode = qrcode;
        this.mcc = params.mcc || this.mcc;
        this.ccy = params.ccy || this.ccy;
        this.country = params.country || this.country;
        this.province = params.province || this.province;

        const field33 = [
            ["00", "BCEL"],
            ["01", "ONEPAY"],
            ["02", this.mcid],
        ];
        if (params.expiretime) field33.push(["03", this.getExpiredTime(params.expiretime)]);
        field33.push(["05", "CLOSEWHENDONE"]);

        const rawqr = this.buildQR([
            ["00", "01"],
            ["01", "11"],
            ["33", this.buildQR(field33)],
            ["52", this.mcc],
            ["53", this.ccy],
            ["54", params.amount],
            ["58", this.country],
            ["60", this.province],
            ["62", this.buildQR([
                ["01", params.invoiceid],
                ["05", params.transactionid],
                ["07", params.terminalid],
                ["08", params.description],
            ])],
        ]);

        const fullqr = rawqr + this.buildQR([["63", this.crc16(rawqr + "6304")]]);
        this.payCode(fullqr);
    }

    getExpiredTime(expiretime) {
        const dateTime = new Date();
        dateTime.setMinutes(dateTime.getMinutes() + expiretime);

        return dateTime.getFullYear().toString() +
            this.padLeft(dateTime.getMonth() + 1) +
            this.padLeft(dateTime.getDate()) +
            this.padLeft(dateTime.getHours()) +
            this.padLeft(dateTime.getMinutes()) +
            this.padLeft(dateTime.getSeconds());
    }

    padLeft(val) {
        return val > 9 ? val : "0" + val;
    }

    buildQR(arr) {
        return arr.map(([key, val]) => val ? `${this.pad2(key)}${this.pad2(val.length)}${val}` : '').join('');
    }

    pad2(data) {
        return ("0" + data).slice(-2);
    }

    crc16(str) {
        let crc = 0xFFFF;

        for (let i = 0; i < str.length; i++) {
            const byte = str.charCodeAt(i);
            const tableIndex = (byte ^ (crc >> 8)) & 0xFF;
            crc = (this.crcTable[tableIndex] ^ (crc << 8)) & 0xFFFF;
        }

        return crc.toString(16).toUpperCase();
    }

    get crcTable() {
        return [/* ... The same CRC table as provided ... */];
    }
};
