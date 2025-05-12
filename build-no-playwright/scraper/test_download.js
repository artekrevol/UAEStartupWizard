import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Define a sample PDF URL to download
const SAMPLE_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
const OUTPUT_DIR = path.join(process.cwd(), 'dmcc_docs/test');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadFile() {
  try {
    console.log(`Downloading file from: ${SAMPLE_URL}`);
    const outputPath = path.join(OUTPUT_DIR, 'test_document.pdf');
    
    // Download file
    const response = await axios({
      method: 'GET',
      url: SAMPLE_URL,
      responseType: 'stream'
    });
    
    // Save to file
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Successfully downloaded file to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', (err) => {
        console.error(`Error writing file:`, err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

// Run the test
downloadFile()
  .then(filePath => {
    if (filePath) {
      console.log('Test completed successfully');
    } else {
      console.error('Test failed');
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  });