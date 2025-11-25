// Simple PDF.js viewer with basic controls
(function(){
  const urlParams = new URLSearchParams(location.search);
  const fileParam = urlParams.get('file') || '../your.pdf';
  const canvas = document.getElementById('pdf-render');
  const ctx = canvas.getContext('2d');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const pageNumInput = document.getElementById('page-num');
  const pageCountSpan = document.getElementById('page-count');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const fitWidthBtn = document.getElementById('fit-width');
  const zoomSpan = document.getElementById('zoom');

  let pdfDoc = null, pageNum = 1, scale = 1.0, rendering = false, pending = null;

  const renderPage = num => {
    rendering = true;
    pdfDoc.getPage(num).then(page => {
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      const renderContext = { canvasContext: ctx, viewport, transform: [dpr, 0, 0, dpr, 0, 0] };
      const renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        rendering = false;
        if (pending !== null) {
          renderPage(pending);
          pending = null;
        }
      });
      pageNumInput.value = num;
      zoomSpan.textContent = Math.round(scale*100) + '%';
    });
  };

  const queueRenderPage = num => {
    if (rendering) pending = num;
    else renderPage(num);
  };

  const showPage = n => {
    if (n < 1 || n > pdfDoc.numPages) return;
    pageNum = n;
    queueRenderPage(pageNum);
  };

  const fitWidth = () => {
    const container = document.getElementById('viewer-wrap');
    const w = container.clientWidth - 16; // padding
    pdfDoc.getPage(pageNum).then(page => {
      const v = page.getViewport({ scale: 1 });
      scale = w / v.width;
      queueRenderPage(pageNum);
    });
  };

  // Load the PDF
  pdfjsLib.getDocument(fileParam).promise.then(pdf => {
    pdfDoc = pdf;
    pageCountSpan.textContent = pdfDoc.numPages;
    // Initial fit width if hash contains zoom=page-width
    if (location.hash.includes('zoom=page-width')) {
      fitWidth();
    } else {
      renderPage(pageNum);
    }
  }).catch(err => {
    console.error('PDF load error:', err);
    document.getElementById('viewer-wrap').innerHTML = '<div style="padding:1rem;color:#c00">PDF를 불러올 수 없습니다.<br>'+String(err)+'</div>';
  });

  // Controls
  prevBtn.addEventListener('click', () => showPage(pageNum - 1));
  nextBtn.addEventListener('click', () => showPage(pageNum + 1));
  pageNumInput.addEventListener('change', () => showPage(parseInt(pageNumInput.value || '1',10)));
  zoomInBtn.addEventListener('click', () => { scale = Math.min(scale * 1.2, 5); queueRenderPage(pageNum); });
  zoomOutBtn.addEventListener('click', () => { scale = Math.max(scale / 1.2, 0.2); queueRenderPage(pageNum); });
  fitWidthBtn.addEventListener('click', fitWidth);

  // Handle orientation / resize
  window.addEventListener('resize', () => {
    if (location.hash.includes('zoom=page-width')) fitWidth();
  });
})();