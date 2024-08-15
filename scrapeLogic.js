const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapePublicRecords = async (name, city, res) => {
  const browser = await puppeteer.launch({
    
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath: 
      process.env.NODE_ENV === 'production' 
        ? process.env.PUPPETEER_EXECUTABLE_PATH 
        : puppeteer.executablePath(),
  });

  try {
    const page = await browser.newPage();

    console.log(`Navigating to judyrecords...`);
    await page.goto('https://www.judyrecords.com/');

    // Wait for the search input to load
    await page.waitForSelector('input[name="search"]', { timeout: 5000 });

    console.log(`Filling in search field...`);
    const searchQuery = `${name} ${city}`;
    await page.type('input[name="search"]', searchQuery);

    console.log(`Submitting search...`);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    // Wait for results to load
    console.log(`Waiting for results...`);
    await page.waitForSelector('.searchResultItem', { timeout: 10000 });

    // Extract links from search results
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.searchResultItem a'))
        .map(a => a.href)
        .slice(0, 5); // Limit to first 5 results to avoid long execution times
    });

    console.log(`Found ${links.length} result links`);

    // Visit each link and extract content
    const records = [];
    for (let i = 0; i < links.length; i++) {
      console.log(`Visiting result ${i + 1}...`);
      await page.goto(links[i], { waitUntil: 'networkidle0' });
      
      const content = await page.evaluate(() => {
        // Adjust this selector to match the main content area of the record page
        const contentElement = document.querySelector('.article-inner');
        return contentElement ? contentElement.innerText : 'Content not found';
      });

      records.push({
        link: links[i],
        content: content
      });
    }

    // Format and send the response
    const formattedRecords = records.map((record, index) => 
        `<p style="color: #f2eded; white-space: pre;">Result ${index + 1}:</p>
        <p style="color: #f2eded; white-space: pre;">\nContent: \n${record.content}\n\n</p>
        `
    ).join('\n\n');
    
    console.log(formattedRecords);
    
    const htmlResponse = `
    <html>
      <body style="background-color: #21282b; color: #333;">
        <h1 style="color: #f2eded;">Public records for ${name} in ${city}:</h1>
        <div style="white-space: pre;">${formattedRecords}</div>
      </body>
    </html>
    `;
    console.log(htmlResponse);
    res.send(htmlResponse);

  } catch (e) {
    console.error(`Error details:`, e);
    res.status(500).send(`Something went wrong while fetching public records. Error: ${e.message}`);
  } finally {
    await browser.close();
  }
};
module.exports = { scrapePublicRecords };