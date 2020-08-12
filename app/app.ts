// Imports
import path from 'path';
import https from 'https';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import LCC from 'lightning-container';


// Constants
const app: express.Application = express();
const PORT: string = process.env.PORT || '5000';
const isLocalhost: boolean = PORT === '5000';

// Configure a new express application instance
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname + '/../', 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname + '/../', 'public')));

// Make it secure
app.use((req, res, next) => {
	if (isLocalhost) {
		next();
	} else {
		if (req.header('x-forwarded-proto') === 'https') {
			// request was via https, so do no special handling
			console.log('Using HTTPS');
			next();
		} else {
			// request was via http, so redirect to https
			console.log('Redirecting to HTTPS');
			res.redirect('https://' + req.headers.host + req.url);
		}
	}
});

// Serve SLDS from the node-modules package
app.use('/slds', express.static(path.join(__dirname, '/../node_modules/@salesforce-ux/design-system/assets/')));
app.use('/', express.static(path.join(__dirname, '/../LWC4WEBSERVER/')));

app.post('/reportQRCode', (inReq, inRes, next) => {
	console.log(inReq.body);

	// Fire platform event
	const jData = inReq.body;
	const peData = JSON.stringify({
		DTTM__c: jData.dttm,
		RecordId__c: jData.copy1
	});

	const options = {
		hostname: jData.serverUrl.replace('https://', ''),
		port: 443,
		path: '/services/data/v47.0/sobjects/QRScan__e',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${jData.sessionId}`
		}
	};

	const peReq = https.request(options, peRes => {
		let data = '';

		peRes.on('data', chunk => {
			data += chunk;
		});
		peRes.on('end', () => {
			console.log(`statusCode: ${peRes.statusCode}`);
			const j = JSON.parse(data);
			inRes.status(200);
			console.log(data);
			inRes.write(data);
			inRes.end();
		});
	});
	peReq.on('error', error => {
		console.error(error);
	});

	peReq.write(peData);
	peReq.end();
});

app.get('/home', (req, res, next) => {
	res.render('pages/home');
});

app.get('/json', (req, res, next) => {
	const jsonFilePath = `${path.join(__dirname, '/../public', '/data.json')}`;

	res.header('Content-Type', 'application/json');
	res.sendFile(jsonFilePath);
});

app.get('/upper', (req, res, next) => {
	res.send(req.query.msg.toUpperCase());
});

app.get('/dttm', (req, res, next) => {
	res.send(JSON.stringify(new Date()).replace(/"/g, ''));
});

// curl -X POST 'http://localhost:5000/echo' -H "Content-Type: application/json" -d '{"A":1,"B":2}'
app.post('/echo', (req, res, next) => {
	res.send(req.body);
});

// Start server (HTTP)
app.listen(PORT, () => {
	if (isLocalhost) {
		console.log(`Listening on http://localhost:${PORT}/`);
	} else {
		console.log('Heroku server started');
	}
});
