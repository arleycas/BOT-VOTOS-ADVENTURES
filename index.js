import puppeteer from 'puppeteer';
import { Telegraf } from 'telegraf';
import { format, addHours } from 'date-fns';
import fs from 'fs';
import 'dotenv/config'
// import { message } from 'telegraf/filters';
const { TOKEN_TELEGRAM, ID_ARLEY_TELEGRAM, URL_ADVENTURES, USER_ADVENTURES, PASS_ADVENTURES } = process.env;
const FILE_STORE_NAME = 'store.json';

const botTG = new Telegraf(TOKEN_TELEGRAM);
botTG.telegram.sendMessage(ID_ARLEY_TELEGRAM, `🤖 Se ejecuta titiritero votaciones...`, { parse_mode: 'Markdown' });

const runBot = async () => {
  // Launch the browser and open a new blank page
  try {
    console.log('🤖 Se inicia titiritero...');
    const browser = await puppeteer.launch({
      headless: 'new', // 'new' para que el navegador No se muestre / false para que se muestre
    });
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto(URL_ADVENTURES);

    await page.type('#login_username', USER_ADVENTURES);
    await page.type('#login_password', PASS_ADVENTURES);

    await (await page.$('#login_password')).press('Enter'); // Enter Key

    const selectoresLinks = {
      Xtremetop: '#section-mains > div > table > tbody > tr:nth-child(3) > td:nth-child(5)',
      RoHispano: '#section-mains > div > table > tbody > tr:nth-child(4) > td:nth-child(5)',
      RagnaTop: '#section-mains > div > table > tbody > tr:nth-child(5) > td:nth-child(5)',
      RoTopServeurs: '#section-mains > div > table > tbody > tr:nth-child(6) > td:nth-child(5)',
      Top100Arena: '#section-mains > div > table > tbody > tr:nth-child(7) > td:nth-child(5)'
    }

    await page.waitForSelector(selectoresLinks.Xtremetop); // espera a que cargue
    await page.keyboard.down('Control'); // Presiona control

    let contVotos = 0;
    for (const key in selectoresLinks) {
      if (Object.hasOwnProperty.call(selectoresLinks, key)) {
        const selector = selectoresLinks[key];
        const link_A = await page.$(selector);
        const texto = await (await link_A.getProperty('textContent')).jsonValue();

        if (texto.trim().toUpperCase() === 'VOTE NOW') {
          await page.click(selector);
          contVotos++;
        }
      }
    }

    const ahoraMismo = new Date();
    await page.keyboard.up('Control'); // Suelta tecla control
    await page.reload();

    // lo crea si no existe
    if (!fs.existsSync(FILE_STORE_NAME)) fs.writeFileSync(FILE_STORE_NAME, JSON.stringify({ fechaUltimoVotoBeauty: 'SIN DATA', fechaUltimoVotoDateObject: 'SIN DATA' }));

    let proximaFechaVoto = null; // * se puede votar cada 20 horas
    let msgTelegram = '';

    if (contVotos === 0) {
      const storedFecha = JSON.parse(fs.readFileSync(FILE_STORE_NAME));
      msgTelegram = `🕐 *Ultimo voto fue:* ${storedFecha.fechaUltimoVotoBeauty}`;
      proximaFechaVoto = addHours(new Date(storedFecha.fechaUltimoVotoDateObject), 20);
    }

    if (contVotos > 0) {
      const ultimaVotacionFecha = {
        fechaUltimoVotoBeauty: format(ahoraMismo, 'dd-MMM KK:mm:ss a'),
        fechaUltimoVotoDateObject: ahoraMismo.toString()
      }

      fs.writeFileSync(FILE_STORE_NAME, JSON.stringify(ultimaVotacionFecha));
      msgTelegram = `✅ *Votos realizados:* ${contVotos}`;
      proximaFechaVoto = addHours(ahoraMismo, 20);
    }

    proximaFechaVoto = format(proximaFechaVoto, 'dd-MMM KK:mm:ss a');
    msgTelegram += `\n🗳❔ *Vota de nuevo:* ${proximaFechaVoto}`

    const selectorLabelVotos = '#section-mains > div > table > tbody > tr:nth-child(1) > td:nth-child(1)';
    await page.waitForSelector(selectorLabelVotos); // espera a que cargue

    const labelVotos = await page.$(selectorLabelVotos);
    const textoVotos = await (await labelVotos.getProperty('textContent')).jsonValue();
    const cantVotosActuales = textoVotos.trim().replace('Current Vote Points:', 'Total votos actuales:')
    await browser.close();
    botTG.telegram.sendMessage(ID_ARLEY_TELEGRAM, `${msgTelegram}\nℹ ${cantVotosActuales}`, { parse_mode: 'Markdown' });
    console.log('🤖 Finaliza titiritero.');

  } catch (error) {
    console.log(error);
    botTG.telegram.sendMessage(ID_ARLEY_TELEGRAM, `❌ *Error al votar.*\n${JSON.stringify(error)}`, { parse_mode: 'Markdown' });
  }
}

runBot();