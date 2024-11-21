app.post("/onepay", (req, res) => {
	try {
		const { uuid, amount, description } = req.body;

		// Validate required fields
		if (!uuid || !amount || !description) {
			return res.status(400).json({ error: "Missing required fields: uuid, amount, or description." });
		}

		// Configuration values
		const mcid = "mch6360de2f6dddd";
		const mcc = "5969";
		const shopcode = "IPAY";

		// Initialize OnePay instance
		let onePay = new OnePay.OnePay(mcid);
		onePay.debug = true;

		// Subscription parameters
		const subParams = {
			uuid: uuid,
			shopcode,
			tid: null,
		};

		// Subscribe to OnePay and handle payment callbacks
		onePay.subscribe(subParams, (data) => {
			if (data.uuid === uuid) {
				console.log("------------>>>>>>PAID SUCCESS");
				io.emit(`TRAIN:${uuid}`, { status: true });
			} else {
				io.emit(`TRAIN:${uuid}`, { status: false });
				console.log("-----------+++++++PAID FAILED");
			}
		});

		// Generate QR Code for payment
		onePay.getCode(
			{
				transactionid: uuid, // Unique transaction ID
				invoiceid: "123", // Invoice ID for the transaction
				terminalid: "001", // Terminal ID
				amount: amount, // Payment amount
				description: description, // Description (must be in English)
				expiretime: 2, // Expiry time in minutes
			},
			(code) => {
				// Send QR code and link as response
				res.status(200).json({
					transaction_id: uuid,
					one_pay_code: `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(
						code
					)}&choe=UTF-8`,
					one_pay_link: `onepay://qr/${code}`,
				});
			}
		);
	} catch (error) {
		console.error("Error handling /onepay request:", error);
		res.status(500).json({ error: "An error occurred while processing the request." });
	}
});
