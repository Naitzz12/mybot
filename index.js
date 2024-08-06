const {
  makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { createSticker, StickerTypes } = require("wa-sticker-formatter");
const ping = require("ping");

async function connectWhatsapp() {
  const auth = await useMultiFileAuthState("mysesi");
  const sock = makeWASocket({
    printQRInTerminal: true,
    browser: ["My Bot", "Safari", "1.0.0"],
    auth: auth.state,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", auth.saveCreds);
  sock.ev.on("connection.update", async ({ connection }) => {
    if (connection === "open") {
      console.log("BOT SIAP! ✓");
    } else if (connection === "close") {
      await connectWhatsapp();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    const chat = messages[0];
    const pesan = (
      chat.message?.extendedTextMessage?.text ??
      chat.message?.ephemeralMessage?.message?.extendedTextMessage?.text ??
      chat.message?.conversation
    )?.toLowerCase();

    if (
      chat.message?.imageMessage?.caption == ".sticker" &&
      chat.message?.imageMessage
    ) {
      const getMedia = async (msg) => {
        const messageType = Object.keys(msg?.message)[0];
        const stream = await downloadContentFromMessage(
          msg.message[messageType],
          messageType.replace("Message", "")
        );
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        return buffer;
      };

      const mediaData = await getMedia(chat);
      const stickeroption = {
        pack: "Bot Sticker",
        author: "Naitzz",
        type: StickerTypes.FULL,
        quality: 50,
      };
      const generateSticker = await createSticker(mediaData, stickeroption);
      await sock.sendMessage(chat.key.remoteJid, { sticker: generateSticker });
    } else if (pesan === ".sticker") {
      await sock.sendMessage(chat.key.remoteJid, {
        text: "Kirim text tersebut beserta gambar untuk bahan sticker",
      });
    } else if (pesan === ".owner") {
      const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        "FN:Naitzz Bot\n" +
        "ORG:Natzz;\n" +
        "TEL;type=CELL;type=VOICE;waid=089667440607:+62 896 6744 0607\n" +
        "END:VCARD";
      const reactionMessage = {
        react: {
          text: "👌", // use an empty string to remove the reaction
          key: chat.key,
        },
      };
      await sock.sendMessage(chat.key.remoteJid, {
        contacts: { displayName: "Naitzz", contacts: [{ vcard }] },
      });
      await sock.sendMessage(chat.key.remoteJid, reactionMessage);
    }
  });
}

connectWhatsapp();
