// src/index.ts
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'
import * as fs from 'fs'
import * as qrcode from 'qrcode-terminal'

// Ambil argumen
const phoneArg = process.argv[2]
const messageArg = process.argv[3]

const phoneNumbers = phoneArg ? JSON.parse(phoneArg) : []
const message = messageArg || ''

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📸 Scan QR below:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ Connected! Sending messages...')
      for (const number of phoneNumbers) {
        const jid = number.endsWith('@s.whatsapp.net') ? number : number + '@s.whatsapp.net'
        await sock.sendMessage(jid, { text: message })
        console.log(`📤 Sent to ${jid}`)
      }
      process.exit(0)
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('🔌 Connection closed. Reconnecting...', shouldReconnect)
      if (shouldReconnect) startBot()
    }
  })
}

startBot()
