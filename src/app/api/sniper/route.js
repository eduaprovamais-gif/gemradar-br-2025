// src/app/api/sniper/route.js
import axios from 'axios';

// === TROCA SÓ AQUI ===
const BOT_TOKEN = '7192483872:AAH...';     // teu bot token
const CHAT_ID   = '-1002123456789';        // teu canal privado ou ID pessoal
// =====================

const seen = new Set();

export async function GET() {
  // Roda a cada vez que alguém acessar (e fica vivo por cron interno da Vercel)
  setInterval(async () => {
    try {
      const { data: tokens } = await axios.get('https://api.pumpportal.fun/api/data/new-tokens?limit=80');

      for (const t of tokens) {
        const mint = t.mint;
        if (seen.has(mint)) continue;
        seen.add(mint);

        const age = (Date.now() / 1000 - t.created_timestamp);
        if (age < 40 || age > 900) continue; // 40s até 15min

        const info = await axios.get(`https://api.pumpportal.fun/api/token/${mint}`).then(r => r.data).catch(() => null);
        if (!info) continue;

        const pump = info.price_change_5m || 0;
        const vol = info.volume_5m || 0;
        const liq = info.liquidity_usd || 0;

        if (pump >= 450 && vol >= 130000 && liq >= 55000) {
          // Anti-rug GoPlus
          const safe = await axios.get(`https://api.gopluslabs.io/api/v1/token_security/solana?contract_addresses=${mint}`)
            .then(r => {
              const d = r.data.result?.[mint.toLowerCase()];
              return d && d.is_honeypot === "0" && d.is_mintable === "0";
            })
            .catch(() => false);
          if (!safe) continue;

          const msg = `
GEM DETECTADA - GemRadar BR 2025

${info.symbol} (${info.name})
Pump 5m: +${pump.toFixed(1)}%
Volume 5m: $${(vol/1000).toFixed(0)}k
Liquidez: $${(liq/1000).toFixed(0)}k
Idade: ${Math.floor(age/60)}min ${Math.floor(age%60)}s

https://dexscreener.com/solana/${mint}
https://photon-sol.tinyastro.io/@buy?token=${mint}
https://bullx.neo/terminal?chainId=sol&address=${mint}

PRIMEIROS TOKENS CAINDO EM MENOS DE 5 SEGUNDOS
          `.trim();

          await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: msg,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          });
        }
      }
    } catch (e) {}
  }, 9500); // 9.5s → roda o tempo todo na Vercel grátis

  return new Response('GemRadar BR 2025 - Sniper ativo 24/7');
}
