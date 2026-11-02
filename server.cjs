// Passenger loads a CommonJS entry point even though the application uses ESM.
const http = require('node:http')
const path = require('node:path')
process.loadEnvFile(path.join(__dirname,'.env'))
process.chdir(__dirname)
const app = require('next')({dev:false,dir:__dirname})
const handler = app.getRequestHandler()
app.prepare().then(() => {
  http.createServer((req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin')
    if(process.env.RELEASE_READY !== 'true') {
      res.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Retry-After':'3600','X-Robots-Tag':'noindex','Cache-Control':'no-store'})
      res.end('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Gravuru Manufaktur</title><body style="font:18px system-ui;max-width:650px;margin:15vh auto;padding:24px"><h1>Gravuru Manufaktur</h1><p>Unsere neue Website wird gerade eingerichtet.</p><p>Für Ihr Vorhaben erreichen Sie uns unter <a href="mailto:info@gravuru.de">info@gravuru.de</a> oder 0521 / 89491076.</p></body></html>')
      return
    }
    handler(req,res).catch(() => { if(!res.headersSent)res.writeHead(500);res.end('Die Seite ist vorübergehend nicht verfügbar.') })
  }).listen(process.env.PORT || 3000)
}).catch(() => { console.error('Die Anwendung konnte nicht gestartet werden.');process.exit(1) })
