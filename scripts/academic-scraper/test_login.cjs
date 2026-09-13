const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const config = require('./dist/config.js');
require('dotenv').config();

(async () => {
    const creds = config.getAvaCredentials();
    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    console.log('Navigating to ava...');
    await page.goto('https://ava.univesp.br/my/', {waitUntil: 'networkidle2'});
    console.log('Current URL:', page.url());
    
    await page.type('#username', creds.username);
    await page.type('#password', creds.password);
    
    console.log('Clicking submit...');
    await page.evaluate(() => {
        document.querySelector('button[type="submit"]').click();
    });
    
    console.log('Waiting for navigation...');
    await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 15000}).catch(e => console.log('Nav timeout:', e.message));
    
    console.log('Navigated to:', page.url());
    await page.screenshot({path: 'debug_login.png', fullPage: true});
    await browser.close();
})();
