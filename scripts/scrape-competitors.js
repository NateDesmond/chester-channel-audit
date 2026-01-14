const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const COMPETITORS = [
  { name: 'carl-alex', url: 'https://www.youtube.com/@CarlAndAlexFishing/videos' },
  { name: 'tafishing', url: 'https://www.youtube.com/@TAFishing/videos' },
  { name: 'fishing-tutorials', url: 'https://www.youtube.com/@FishingTutorials/videos' }
];

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function scrapeCompetitor(page, competitor) {
  console.log(`\nScraping ${competitor.name} from ${competitor.url}...`);

  await page.goto(competitor.url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait and scroll to load images
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => window.scrollBy(0, 500));
  await new Promise(r => setTimeout(r, 2000));

  // Wait for thumbnails to load
  await page.waitForSelector('img[src*="ytimg.com"]', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  // Get top 3 video thumbnails
  const thumbnails = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('ytd-rich-item-renderer');

    for (let i = 0; i < items.length && results.length < 3; i++) {
      const item = items[i];
      const img = item.querySelector('img');
      const titleEl = item.querySelector('#video-title');
      const viewsEl = item.querySelector('#metadata-line span:first-child');

      if (img && img.src && img.src.includes('ytimg.com') && !img.src.includes('placeholder')) {
        // Extract video ID and build hq thumbnail URL
        const match = img.src.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
        const videoId = match ? match[1] : null;

        results.push({
          thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : img.src,
          title: titleEl ? titleEl.textContent.trim() : 'Unknown',
          views: viewsEl ? viewsEl.textContent.trim() : 'Unknown',
          videoId: videoId
        });
      }
    }
    return results;
  });

  console.log(`Found ${thumbnails.length} thumbnails for ${competitor.name}`);
  thumbnails.forEach((t, i) => console.log(`  ${i+1}. ${t.title.substring(0, 50)}...`));

  return thumbnails;
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'assets', 'competitors');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const allData = {};

  for (const competitor of COMPETITORS) {
    try {
      const thumbnails = await scrapeCompetitor(page, competitor);
      allData[competitor.name] = thumbnails;

      // Download thumbnails
      for (let i = 0; i < thumbnails.length; i++) {
        const thumb = thumbnails[i];
        const filename = `${competitor.name}-${i + 1}.jpg`;
        const filepath = path.join(outputDir, filename);

        try {
          await downloadImage(thumb.thumbnail, filepath);
          console.log(`  Downloaded: ${filename}`);
          thumb.localPath = `assets/competitors/${filename}`;
        } catch (err) {
          console.log(`  Failed to download ${filename}: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`Error scraping ${competitor.name}: ${err.message}`);
      allData[competitor.name] = [];
    }
  }

  await browser.close();

  // Save metadata
  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(allData, null, 2));
  console.log(`\nMetadata saved to ${metadataPath}`);

  console.log('\n=== FINAL SUMMARY ===');
  let total = 0;
  for (const [name, data] of Object.entries(allData)) {
    console.log(`${name}: ${data.length} thumbnails`);
    total += data.length;
  }
  console.log(`Total: ${total} thumbnails`);
}

main().catch(console.error);
