import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

export async function getResumeText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Resume file not found at: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  } else {
    return fs.readFileSync(filePath, 'utf-8');
  }
}
