// PDF export using jsPDF

export async function exportBriefingPDF(briefingText, title = 'Briefing') {
  const { default: jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // Header bar
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('BRIEFING: PLANO DE AÇÃO ESTRATÉGICO', margin, 22)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 28, { align: 'right' })

  y = 45

  // Parse and render the briefing text
  doc.setTextColor(30, 30, 30)
  const lines = briefingText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty separator lines (=====)
    if (/^=+$/.test(trimmed)) continue

    // Check if we need a new page
    if (y > pageHeight - 25) {
      doc.addPage()
      y = margin
    }

    // Section headers (like "0. HISTÓRICO", "1. ESCOPO")
    if (/^(\d+\.?\d?\.?\s|FICHA|===)/.test(trimmed) || trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.startsWith('-')) {
      const cleanTitle = trimmed.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
      if (!cleanTitle) continue

      y += 4

      // Section header background
      doc.setFillColor(243, 244, 246)
      doc.roundedRect(margin - 2, y - 5, contentWidth + 4, 9, 1, 1, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(99, 102, 241)
      doc.text(cleanTitle, margin, y)
      y += 10
      continue
    }

    // Sub-items with dash
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)

      // Check if has label: value format
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx > 0 && colonIdx < 40) {
        const label = trimmed.slice(1, colonIdx + 1).trim()
        const value = trimmed.slice(colonIdx + 1).trim()

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 40, 40)
        doc.text(`  ${label}`, margin + 2, y)

        const labelWidth = doc.getTextWidth(`  ${label} `)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)

        const valueLines = doc.splitTextToSize(value, contentWidth - labelWidth - 4)
        doc.text(valueLines[0] || '', margin + 2 + labelWidth, y)
        y += 5

        for (let i = 1; i < valueLines.length; i++) {
          if (y > pageHeight - 25) { doc.addPage(); y = margin }
          doc.text(valueLines[i], margin + 6, y)
          y += 5
        }
      } else {
        const bulletText = trimmed.slice(1).trim()
        const wrappedLines = doc.splitTextToSize(`• ${bulletText}`, contentWidth - 4)
        for (const wl of wrappedLines) {
          if (y > pageHeight - 25) { doc.addPage(); y = margin }
          doc.text(wl, margin + 2, y)
          y += 5
        }
      }
      continue
    }

    // Regular paragraph text
    if (trimmed) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50)
      const wrappedLines = doc.splitTextToSize(trimmed, contentWidth)
      for (const wl of wrappedLines) {
        if (y > pageHeight - 25) { doc.addPage(); y = margin }
        doc.text(wl, margin, y)
        y += 5
      }
    } else {
      y += 3
    }
  }

  // Footer on each page
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
    doc.text('Gerado pelo Briefing Generator', margin, pageHeight - 8)
  }

  // Save
  const safeTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 50)
  doc.save(`briefing_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Export briefing as a plain .txt file
 */
export function exportBriefingTXT(briefingText, title) {
  const safe = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 50)
  const date = new Date().toISOString().slice(0, 10)
  const header = `BRIEFING: ${title}\nGerado em: ${new Date().toLocaleDateString('pt-BR')}\n${'='.repeat(60)}\n\n`
  const blob = new Blob([header + briefingText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `briefing_${safe}_${date}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export briefing as a beautiful standalone HTML file with scroll animations
 */
export function exportBriefingHTML(briefingText, title, images = []) {
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const safe = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 50)

  // ---- Parse briefing text into sections ----
  const lines = briefingText.split('\n')
  const sections = []
  let current = null

  for (const raw of lines) {
    const t = raw.trim()
    if (!t || /^=+$/.test(t) || /={3,}/.test(t)) continue

    const isHead =
      /^(\d+\.[\d.]*\s+\S)/.test(t) ||
      (!/[a-z]/.test(t) && t.length >= 4 && t.length <= 80 && !/^[-•]/.test(t) && /[A-ZÁÉÍÓÚ]/.test(t))

    if (isHead) {
      current = { title: t, lines: [] }
      sections.push(current)
      continue
    }
    if (!current) { current = { title: '', lines: [] }; sections.push(current) }

    if (/^[-•]/.test(t)) {
      current.lines.push({ type: 'bullet', text: t.slice(1).trim() })
    } else {
      current.lines.push({ type: 'text', text: t })
    }
  }

  // ---- Render sections HTML ----
  const sectionsHTML = sections.map((s, i) => {
    const numMatch = s.title.match(/^(\d+\.[\d.]*)\s+(.+)/)
    const num = numMatch ? numMatch[1] : String(i + 1).padStart(2, '0')
    const titleText = numMatch ? numMatch[2] : s.title.replace(/:$/, '')
    if (!titleText && !s.lines.length) return ''

    let body = ''
    let inList = false
    for (const ln of s.lines) {
      if (ln.type === 'bullet') {
        if (!inList) { body += '<ul>'; inList = true }
        const ci = ln.text.indexOf(':')
        if (ci > 0 && ci < 50) {
          body += `<li><strong>${esc(ln.text.slice(0, ci))}:</strong> ${esc(ln.text.slice(ci + 1).trim())}</li>`
        } else {
          body += `<li>${esc(ln.text)}</li>`
        }
      } else {
        if (inList) { body += '</ul>'; inList = false }
        if (ln.text) body += `<p>${esc(ln.text)}</p>`
      }
    }
    if (inList) body += '</ul>'

    const delay = Math.min(i * 70, 350)
    return `
    <div class="section reveal" style="--d:${delay}ms">
      <div class="sh"><span class="sn">${esc(num)}</span><h2 class="st">${esc(titleText)}</h2></div>
      <div class="sb">${body}</div>
    </div>`
  }).filter(Boolean).join('\n')

  // ---- Gallery HTML ----
  const galleryHTML = images.length > 0 ? `
  <section class="gallery reveal">
    <h2 class="gtitle">Referências Visuais <span>(${images.length})</span></h2>
    <div class="gg">${images.map(img => `
      <div class="gi" onclick="openLb(this)">
        <img src="${img.src}" alt="${esc(img.name)}" loading="lazy">
        <div class="gc"><span>${esc(img.name)}</span></div>
      </div>`).join('')}
    </div>
  </section>
  <div id="lb" onclick="closeLb()">
    <span class="lbx" onclick="event.stopPropagation();closeLb()">&#215;</span>
    <img id="lbimg" src="" alt="" onclick="event.stopPropagation()">
  </div>` : ''

  // ---- Full HTML ----
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Briefing — ${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,sans-serif;background:#0a0a1a;color:#e2e8f0;line-height:1.7;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(99,102,241,.1) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 85% 100%,rgba(139,92,246,.07) 0%,transparent 50%);pointer-events:none;z-index:0}
#bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#6366f1,#a78bfa,#ec4899);z-index:999;transition:width .1s;border-radius:0 3px 3px 0;width:0}
/* HERO */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:5rem 2rem;position:relative;z-index:1}
.eyebrow{display:inline-block;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);border-radius:999px;padding:.4rem 1.2rem;font-size:.7rem;font-weight:700;color:#a78bfa;letter-spacing:2px;text-transform:uppercase;margin-bottom:2rem}
.hero h1{font-family:'Outfit',sans-serif;font-size:clamp(2.5rem,7vw,5rem);font-weight:900;line-height:1.1;background:linear-gradient(135deg,#fff 0%,#a78bfa 50%,#6366f1 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:1.25rem}
.hbar{width:80px;height:3px;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:2px;margin:0 auto 1.5rem}
.hdate{color:#64748b;font-size:.9rem}
.scroll-hint{position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);color:#475569;font-size:.7rem;letter-spacing:1.5px;text-transform:uppercase;display:flex;flex-direction:column;align-items:center;gap:.5rem;animation:bob 2.2s ease-in-out infinite}
.scroll-hint::after{content:'↓';font-size:1.1rem;color:#6366f1}
/* MAIN */
main{max-width:860px;margin:0 auto;padding:1rem 2rem 4rem;position:relative;z-index:1}
/* SECTION */
.section{background:rgba(26,26,62,.55);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.07);border-radius:20px;overflow:hidden;margin-bottom:2rem;transition:border-color .35s,box-shadow .35s}
.section:hover{border-color:rgba(99,102,241,.28);box-shadow:0 8px 40px rgba(99,102,241,.09)}
.sh{display:flex;align-items:flex-start;gap:1rem;padding:1.75rem 2rem 0}
.sn{font-family:'Outfit',sans-serif;font-size:3rem;font-weight:900;line-height:1;color:rgba(99,102,241,.18);flex-shrink:0;min-width:3rem;user-select:none}
.st{font-family:'Outfit',sans-serif;font-size:.82rem;font-weight:700;color:#a78bfa;letter-spacing:.8px;text-transform:uppercase;padding-top:.9rem}
.sb{padding:.75rem 2rem 2rem}
.sb p{color:#94a3b8;font-size:.95rem;margin-bottom:.75rem;line-height:1.8}
.sb p:last-child{margin-bottom:0}
.sb ul{list-style:none;display:flex;flex-direction:column;gap:.5rem}
.sb li{color:#94a3b8;font-size:.9rem;padding:.6rem 1rem;background:rgba(255,255,255,.03);border-radius:8px;border-left:2px solid rgba(99,102,241,.35);line-height:1.6}
.sb li strong{color:#f1f5f9;font-weight:600}
/* GALLERY */
.gallery{max-width:860px;margin:0 auto 4rem;padding:0 2rem;position:relative;z-index:1}
.gtitle{font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:#f1f5f9;margin-bottom:1.5rem;text-align:center}
.gtitle span{color:#6366f1;font-size:1rem;font-weight:600}
.gg{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}
.gi{border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.08);position:relative;cursor:zoom-in;aspect-ratio:4/3;background:#111128}
.gi img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease;display:block}
.gi:hover img{transform:scale(1.08)}
.gc{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.75) 0%,transparent 50%);display:flex;align-items:flex-end;padding:.75rem;opacity:0;transition:opacity .3s}
.gi:hover .gc{opacity:1}
.gc span{color:#fff;font-size:.75rem;font-weight:500}
/* LIGHTBOX */
#lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,.93);backdrop-filter:blur(14px);z-index:9999;align-items:center;justify-content:center;cursor:pointer}
#lb.on{display:flex}
#lb img{max-width:92vw;max-height:88vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);cursor:default}
.lbx{position:fixed;top:1.5rem;right:1.5rem;color:#fff;font-size:2.5rem;cursor:pointer;opacity:.55;line-height:1;z-index:10000;transition:opacity .2s}
.lbx:hover{opacity:1}
/* FOOTER */
footer{text-align:center;padding:3rem 2rem;color:#475569;font-size:.8rem;line-height:2;border-top:1px solid rgba(255,255,255,.06);position:relative;z-index:1}
footer strong{color:#a78bfa}
/* REVEAL */
.reveal{opacity:0;transform:translateY(32px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1);transition-delay:var(--d,0ms)}
.reveal.in{opacity:1;transform:translateY(0)}
/* SCROLLBAR */
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.35);border-radius:3px}
/* RESPONSIVE */
@media(max-width:640px){.sh{gap:.75rem}.sn{font-size:2rem}.sb{padding:.75rem 1.25rem 1.5rem}.gg{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}.hero h1{font-size:2.5rem}}
@keyframes bob{0%,100%{transform:translateX(-50%)}50%{transform:translateX(-50%) translateY(9px)}}
</style>
</head>
<body>
<div id="bar"></div>

<header class="hero reveal">
  <span class="eyebrow">Briefing Estratégico</span>
  <h1>${esc(title)}</h1>
  <div class="hbar"></div>
  <p class="hdate">Gerado em ${date}</p>
  <div class="scroll-hint">Rolar</div>
</header>

<main>
${sectionsHTML}
</main>

${galleryHTML}

<footer>
  Gerado pelo <strong>Briefing Generator</strong> · Powered by Gemini AI<br>
  ${date}
</footer>

<script>
const bar=document.getElementById('bar');
window.addEventListener('scroll',()=>{
  const p=window.scrollY/(document.body.scrollHeight-window.innerHeight)*100;
  bar.style.width=Math.min(p,100)+'%';
},{ passive:true });

const io=new IntersectionObserver(es=>{
  es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{ threshold:.1 });
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

function openLb(el){
  document.getElementById('lbimg').src=el.querySelector('img').src;
  document.getElementById('lb').classList.add('on');
  document.body.style.overflow='hidden';
}
function closeLb(){
  document.getElementById('lb').classList.remove('on');
  document.body.style.overflow='';
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeLb(); });
</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `briefing_${safe}_${new Date().toISOString().slice(0, 10)}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Copy briefing text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
  }
}
