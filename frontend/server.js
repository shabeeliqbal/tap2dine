const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// cPanel Phusion Passenger support
if (typeof(PhusionPassenger) !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Listen on 'passenger' socket if available (cPanel), otherwise use PORT
  const listenTarget = typeof(PhusionPassenger) !== 'undefined' ? 'passenger' : port;
  
  server.listen(listenTarget, () => {
    console.log(`> Frontend ready`);
    console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`> Passenger: ${typeof(PhusionPassenger) !== 'undefined' ? 'YES' : 'NO'}`);
  });
});
