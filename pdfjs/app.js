// PDF.js 기본 설정
const urlParams = new URLSearchParams(window.location.search);
const fileParam = urlParams.get("file") || "../US-Biztrip-Guideline.pdf";

// DOM 요소
const canvas = document.getElementById("pdf-render");
const ctx = canvas.getContext("2d");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const pageNumInput = document.getElementById("page-num");
const pageCountEl = document.getElementById("page-count");
const zoomOutBtn = document.getElementById("zoom-out");
const zoomInBtn = document.getElementById("zoom-in");
const fitWidthBtn = document.getElementById("fit-width");
const zoomEl = document.getElementById("zoom");
const viewerWrap = document.getElementById("viewer-wrap");

let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;
let scale = 1.2; // 기본 확대 배율

// 페이지 렌더링
const renderPage = (num) => {
  pageIsRendering = true;

  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale });

    // 캔버스 크기를 페이지에 맞춤
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderCtx = {
      canvasContext: ctx,
      viewport,
    };

    const renderTask = page.render(renderCtx);

    renderTask.promise.then(() => {
      pageIsRendering = false;

      if (pageNumIsPending !== null) {
        renderPage(pageNumIsPending);
        pageNumIsPending = null;
      }
    });

    // UI 업데이트
    pageNumInput.value = num;
    pageCountEl.textContent = pdfDoc.numPages;
    zoomEl.textContent = Math.round(scale * 100) + "%";
  });
};

const queueRenderPage = (num) => {
  if (pageIsRendering) {
    pageNumIsPending = num;
  } else {
    renderPage(num);
  }
};

const showPrevPage = () => {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
};

const showNextPage = () => {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
};

// Fit width: 화면 폭에 맞춰 스케일 자동조정
const fitWidth = () => {
  const tempScale = 1; // 기준 스케일
  pdfDoc.getPage(pageNum).then((page) => {
    const viewport = page.getViewport({ scale: tempScale });
    const wrapWidth = viewerWrap.clientWidth - 24; // 패딩 감안

    scale = wrapWidth / viewport.width;
    if (scale < 0.6) scale = 0.6;
    if (scale > 3) scale = 3;

    queueRenderPage(pageNum);
  });
};

// 이벤트 연결
prevBtn.addEventListener("click", showPrevPage);
nextBtn.addEventListener("click", showNextPage);

pageNumInput.addEventListener("change", (e) => {
  let desiredPage = parseInt(e.target.value, 10);
  if (isNaN(desiredPage) || desiredPage < 1) desiredPage = 1;
  if (desiredPage > pdfDoc.numPages) desiredPage = pdfDoc.numPages;
  pageNum = desiredPage;
  queueRenderPage(pageNum);
});

zoomInBtn.addEventListener("click", () => {
  scale *= 1.15;
  if (scale > 5) scale = 5;
  queueRenderPage(pageNum);
});

zoomOutBtn.addEventListener("click", () => {
  scale /= 1.15;
  if (scale < 0.4) scale = 0.4;
  queueRenderPage(pageNum);
});

fitWidthBtn.addEventListener("click", fitWidth);

// 페이지 스와이프 제스처 설정
const setupSwipe = () => {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let isTouching = false;

  const threshold = 60; // 좌우 스와이프 인식 최소 이동거리(px)
  const verticalLimit = 80; // 세로 이동이 너무 크면 무시

  // 터치 시작
  viewerWrap.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) {
        // 핀치줌(멀티터치)은 스와이프에서 제외
        isTouching = false;
        return;
      }
      isTouching = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  // 터치 종료
  viewerWrap.addEventListener(
    "touchend",
    (e) => {
      if (!isTouching || !pdfDoc) return;

      const touch = e.changedTouches[0];
      touchEndX = touch.clientX;
      const touchEndY = touch.clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      // 세로 이동이 너무 크면 스크롤로 간주하고 스와이프 무시
      if (Math.abs(dy) > verticalLimit) {
        isTouching = false;
        return;
      }

      if (Math.abs(dx) > threshold) {
        if (dx < 0 && pageNum < pdfDoc.numPages) {
          // 왼쪽으로 스와이프 → 다음 페이지
          showNextPage();
        } else if (dx > 0 && pageNum > 1) {
          // 오른쪽으로 스와이프 → 이전 페이지
          showPrevPage();
        }
      }

      isTouching = false;
    },
    { passive: true }
  );

  // 데스크톱용 마우스 드래그(옵션)
  let mouseDown = false;
  let mouseStartX = 0;
  let mouseStartY = 0;

  viewerWrap.addEventListener("mousedown", (e) => {
    mouseDown = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
  });

  window.addEventListener("mouseup", (e) => {
    if (!mouseDown || !pdfDoc) return;
    mouseDown = false;

    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;

    if (Math.abs(dy) > verticalLimit) return;

    if (Math.abs(dx) > threshold) {
      if (dx < 0 && pageNum < pdfDoc.numPages) {
        showNextPage();
      } else if (dx > 0 && pageNum > 1) {
        showPrevPage();
      }
    }
  });
};

// PDF 로드
pdfjsLib
  .getDocument(fileParam)
  .promise.then((pdfDoc_) => {
    pdfDoc = pdfDoc_;
    pageCountEl.textContent = pdfDoc.numPages;

    // 첫 페이지 렌더링
    renderPage(pageNum);

    // 초기 폭 맞춤 한 번 수행해도 좋음 (선호에 따라)
    // fitWidth();

    // 스와이프 제스처 활성화
    setupSwipe();
  })
  .catch((err) => {
    console.error("PDF 로드 중 오류:", err);
    alert("PDF 문서를 불러오는 중 오류가 발생했습니다.");
  });
