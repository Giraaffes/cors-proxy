require("express-async-errors");

const express = require("express");
const axios = require("axios");

const server = express();


const urlRegex = /^(https?:\/\/[^\/]+)\/?(.*)/;

server.use(express.raw({type: "*/*", limit: "100mb"}));
server.use(async (req, res, next) => {
	let url = req.url.slice(1);
	if (!url.match(urlRegex)) {
		if (!req.headers["referer"]) return next();

		let refererUrl = req.headers["referer"].match(urlRegex)[2];
		let refererUrlMatch = refererUrl.match(urlRegex);
		if (!refererUrlMatch) return next();

		let refererBaseUrl = refererUrlMatch[1];
		url = `${refererBaseUrl}/${url}`;
	}

	if (Object.keys(req.body).length == 0) req.body = null;

	delete req.headers["host"];
	delete req.headers["content-length"];
	let inspirRes = await axios({
		method: req.method,
		url: url,
		headers: req.headers,
		data: req.body,
		responseType: "arraybuffer",
		responseEncoding: "binary",
		maxRedirects: 0,
		validateStatus: () => true
	});
	console.log(inspirRes);

	// To fix a glitch (I think) where nginx complains when both transfer-encoding and content-length are sent
	delete inspirRes.headers["transfer-encoding"];

	res.statusMessage = inspirRes.statusText;
	res.status(inspirRes.status);
	res.set(inspirRes.headers);
	res.send(inspirRes.data);
	res.end();
});

server.use((req, res, next) => {
	res.status(404).send("Invalid URL").end();
});

server.use((err, req, res, next) => {
	let timeStr = (new Date()).toLocaleString({timeZone: "Europe/Copenhagen"});
  console.error(timeStr, req.url, err);

  res.status(500).send("<title>Fejl</title>Beklager, der opstod en fejl...").end();
})


server.listen(3000, "127.0.0.1", () => {
	console.log("CORS proxy ready");
});