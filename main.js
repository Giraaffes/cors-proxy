require("express-async-errors");

const express = require("express");
const axios = require("axios");

const server = express();


const urlRegex = /^(https?:\/\/[^\/]+)\/?(.*)/;

server.use(express.raw({type: "*/*", limit: "100mb"}));
server.use(async (req, res, next) => {
	res.set("access-control-allow-origin", "*");
	res.set("access-control-allow-methods", "GET, PUT, PATCH, POST, DELETE");
	res.set("access-control-allow-headers", req.get("access-control-request-headers"));
	if (req.method == "OPTIONS") {
		res.status(200).end();
		return;
	}

	delete req.headers["host"];
	delete req.headers["content-length"];
	let proxyRes = await axios({
		url: req.query["url"],
		method: req.method,
		headers: req.headers,
		data: Object.keys(req.body).length > 0 && req.body,
		responseType: "arraybuffer",
		responseEncoding: "binary",
		maxRedirects: 0,
		validateStatus: () => true
	});

	// To fix a glitch (I think) where nginx complains when both transfer-encoding and content-length are sent
	delete proxyRes.headers["transfer-encoding"];

	res.statusMessage = proxyRes.statusText;
	res.status(proxyRes.status);
	res.set(proxyRes.headers);
	res.send(proxyRes.data);
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


server.listen(4000, "127.0.0.1", () => {
	console.log("CORS proxy ready");
});