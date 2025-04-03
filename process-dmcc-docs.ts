import { processDMCCDocuments } from './server/document-upload';

async function processDocuments() {
  console.log('Starting standalone document processing...');
  
  try {
    const result = await processDMCCDocuments();
    console.log('Processing completed with result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error during processing:', error);
  }
}

processDocuments().catch(console.error);