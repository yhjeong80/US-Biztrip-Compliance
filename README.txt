My PDF App (PWA) — with PDF.js Viewer

1) Place your PDF file as 'your.pdf' in the root next to index.html (or change index.html iframe URL).
2) Deploy to any static host (GitHub Pages, Netlify, Vercel). HTTPS required for PWA features.
3) Mobile: Add to Home Screen / Install app to use as a fullscreen app.
4) Viewer controls: prev/next, page number, zoom in/out, fit width.

If you already have a PDF file name, update:
- index.html -> iframe src="pdfjs/viewer.html?file=../YOURFILE.pdf#zoom=page-width"
