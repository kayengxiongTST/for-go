app.post('/onepay/test', (req, res) => {
	const { uuid, amount, description } = req.body
	const mcid = 'mch5c2f0404102fb' //BCEL Test Payment
	const mcc = '5969'
	const shopcode = 'BCEL_TEST'
	let onePay = new OnePay.OnePay(mcid)
	onePay.debug = true

	var subParams = {
		uuid: uuid,
		shopcode: null,
		tid: null
	}
	onePay.subscribe(subParams, function (data) {
		console.log(`inside subsribed:++++++++++${data.uuid}`)
		console.log(`uuid:++++++++++${uuid}`)
		if (data.uuid === uuid) {
			console.log('------------>>>>>>PAID SUCCESS')
			io.emit(`TRAIN:${uuid}`, { status: true })
		} else {
			io.emit(`TRAIN:${uuid}`, { status: false })
			console.log('-----------+++++++PAID FAILED')
		}
	})
	onePay.getCode(
		{
			transactionid: uuid, // please define as unique key
			invoiceid: '123', // a invoice ID can pay many times OR have many transaction ID
			terminalid: '001', // terminal ID (in case have many terminals, POS devices or etc...)
			amount: 1, // invoice amount
			description: description, // must define as English text
			expiretime: 2 // expire time must be minutes
		},
		function (code) {
			res.status(200).json({
				transaction_id: uuid,
				one_pay_code: code,
				one_pay_link: 'onepay://qr/' + code
			})
		}
	)
})
