// File parsing utilities — extract text from PDFs, DOCX, TXT in the browser

/**
 * Extract text from a File object based on its type
 */
export async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  switch (ext) {
    case 'txt':
    case 'csv':
    case 'md':
      return await readAsText(file)
    case 'docx':
      return await parseDocx(file)
    case 'pdf':
      return await parsePdf(file)
    default:
      return `[Arquivo: ${file.name} — tipo não suportado para extração de texto]`
  }
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'utf-8')
  })
}

async function parseDocx(file) {
  try {
    const mammothModule = await import('mammoth')
    const mammoth = mammothModule.default || mammothModule
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch (err) {
    console.error('Error parsing DOCX:', err)
    return `[Erro ao ler ${file.name}: ${err.message}]`
  }
}

async function parsePdf(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      fullText += pageText + '\n\n'
    }
    
    return fullText.trim()
  } catch (err) {
    console.error('Error parsing PDF:', err)
    return `[Erro ao ler ${file.name}: ${err.message}]`
  }
}

/**
 * Convert a File to a base64 data URL (for images)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
