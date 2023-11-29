import puppeteer from 'puppeteer';
import { Telegraf } from 'telegraf';
import { format } from 'date-fns';
import fs from 'fs';
import 'dotenv/config'
// import { message } from 'telegraf/filters';
const { TOKEN_TELEGRAM, ID_ARLEY_TELEGRAM, URL_ADVENTURES, USER_ADVENTURES, PASS_ADVENTURES } = process.env;
const FILE_STORE_NAME = 'store.json';

const botTG = new Telegraf(TOKEN_TELEGRAM);
botTG.telegram.sendMessage(ID_ARLEY_TELEGRAM, `🤖 Se ejecuta titiritero votaciones...`, { parse_mode: 'Markdown' });

(async () => {
  // Launch the browser and open a new blank page
  try {
    console.log('🤖 Se inicia titiritero...');
    const browser = await puppeteer.launch({
      headless: 'new', // 'new' para que el navegador No se muestre / false para que se muestre
    });
    const page = await browser.newPage();
    let proximaFechaVoto = null;
    let msgTelegram = '';

    page.on('dialog', async dialog => {
      const textoDialog = dialog.message();
      const fechaDialog = textoDialog.replace('Blocked in voting for site until:', '').trim();
      proximaFechaVoto = format(new Date(fechaDialog), 'dd-MMM KK:mm:ss a');

      await dialog.accept()
    });

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
    const ahoraMismo = new Date();
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

    await page.keyboard.up('Control'); // Suelta tecla control
    await page.reload();

    // se le da clic al primer link para ver hasta cuando se puede votar de nuevo
    // en el evento dialog (que es la ventana alert obtenermos la fecha de proxima votación)
    await page.click(selectoresLinks.Xtremetop);

    // lo crea si no existe
    if (!fs.existsSync(FILE_STORE_NAME))
      fs.writeFileSync(FILE_STORE_NAME, JSON.stringify({ fechaUltimoVotoBeauty: 'SIN DATA', fechaUltimoVotoDateObject: 'SIN DATA' }));

    if (contVotos === 0) {
      const storedFecha = JSON.parse(fs.readFileSync(FILE_STORE_NAME));
      msgTelegram = `🕐 *Ultimo voto fue:* ${storedFecha.fechaUltimoVotoBeauty}`;
    }

    if (contVotos > 0) {
      const ultimaVotacionFecha = {
        fechaUltimoVotoBeauty: format(ahoraMismo, 'dd-MMM KK:mm:ss a'),
        fechaUltimoVotoDateObject: ahoraMismo.toString()
      }

      fs.writeFileSync(FILE_STORE_NAME, JSON.stringify(ultimaVotacionFecha));
      msgTelegram = `✅ *Votos realizados:* ${contVotos}`;
    }

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
})();