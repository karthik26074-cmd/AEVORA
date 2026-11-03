import fs from 'fs';
import path from 'path';

export interface ParsedDocument {
  text: string;
  wordCount: number;
  extractedMetadata?: Record<string, any>;
}

/**
 * Extracts clean, searchable text from multiple document formats:
 * PDF, DOCX, TXT, CSV, JSON, Markdown
 */
export function extractTextFromFile(filePath: string, originalName: string, mimetype?: string): ParsedDocument {
  const ext = path.extname(originalName).toLowerCase();

  try {
    if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return {
        text: raw,
        wordCount: raw.split(/\s+/).filter(Boolean).length,
      };
    }

    if (ext === '.csv') {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return { text: '', wordCount: 0 };

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      let formattedText = `# CSV Document: ${originalName}\n\n`;
      formattedText += `Columns: ${headers.join(', ')}\n\n`;
      formattedText += `## Structured Records:\n`;

      const rows = lines.slice(1);
      rows.forEach((line, idx) => {
        const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const rowDesc = headers.map((h, i) => `${h}: ${values[i] || 'N/A'}`).join(' | ');
        formattedText += `- Record #${idx + 1}: ${rowDesc}\n`;
      });

      return {
        text: formattedText,
        wordCount: formattedText.split(/\s+/).filter(Boolean).length,
      };
    }

    if (ext === '.json') {
      const raw = fs.readFileSync(filePath, 'utf-8');
      try {
        const parsed = JSON.parse(raw);
        let formatted = `# JSON Specification: ${originalName}\n\n`;
        formatted += '```json\n' + JSON.stringify(parsed, null, 2).slice(0, 50000) + '\n```\n';
        return {
          text: formatted,
          wordCount: formatted.split(/\s+/).filter(Boolean).length,
        };
      } catch {
        return { text: raw, wordCount: raw.split(/\s+/).filter(Boolean).length };
      }
    }

    if (ext === '.docx') {
      // DOCX files are ZIP archives containing word/document.xml.
      // We can extract readable text by reading the binary and extracting <w:t> tags or text segments.
      const buffer = fs.readFileSync(filePath);
      const str = buffer.toString('utf-8', 0, Math.min(buffer.length, 5 * 1024 * 1024));
      
      // Look for XML text blocks <w:t>...</w:t>
      const textMatches = str.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (textMatches && textMatches.length > 0) {
        const extracted = textMatches
          .map((m) => m.replace(/<[^>]+>/g, '').trim())
          .filter(Boolean)
          .join(' ');
        
        const formatted = `# DOCX Specification: ${originalName}\n\n${extracted}`;
        return {
          text: formatted,
          wordCount: formatted.split(/\s+/).filter(Boolean).length,
        };
      }

      // Fallback: clean ASCII printable characters
      const cleanChars = str.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s{2,}/g, ' ');
      return {
        text: `# Document: ${originalName}\n\n${cleanChars.slice(0, 10000)}`,
        wordCount: cleanChars.split(/\s+/).filter(Boolean).length,
      };
    }

    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const str = buffer.toString('utf-8', 0, Math.min(buffer.length, 5 * 1024 * 1024));
      
      // Extract text stream objects or printable strings
      const textChunks: string[] = [];
      const streamRegex = /\(([^)]+)\)\s*Tj/g;
      let match: RegExpExecArray | null;
      while ((match = streamRegex.exec(str)) !== null) {
        if (match[1] && match[1].length > 1) {
          textChunks.push(match[1]);
        }
      }

      if (textChunks.length > 5) {
        const text = `# PDF Document: ${originalName}\n\n` + textChunks.join(' ');
        return {
          text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
        };
      }

      // Fallback printable text extraction
      const cleanChars = str.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s{2,}/g, ' ');
      return {
        text: `# PDF Document: ${originalName}\n\n${cleanChars.slice(0, 10000)}`,
        wordCount: cleanChars.split(/\s+/).filter(Boolean).length,
      };
    }

    // Default fallback
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { text: raw, wordCount: raw.split(/\s+/).filter(Boolean).length };
  } catch (err) {
    console.warn(`[DocumentParser] Error reading file ${originalName}:`, err);
    return {
      text: `Document uploaded: ${originalName} (Error parsing text content)`,
      wordCount: 5,
    };
  }
}

