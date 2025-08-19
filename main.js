// PDF Tools
const pdfTools = document.getElementById("pdf_tools");
const pdfMenu = document.getElementById("pdf_tools_menu");
const fullscreenCheckbox = document.getElementById("fullscreenCheck");

const IMPORT_LIST = [
  {
    title: "Tensura Volume 1",
    name: "Volume 1",
    link: "/novel/1",
    page: {
      start: 1,
      end: 2,
      block: [3, 5, 7],
    },
  },
  {
    title: "Tensura Volume 2",
    name: "Volume 2",
    link: "/novel/2",
    page: {
      start: 1,
      end: 6,
      block: [3, 5],
    },
  },
];

pdfTools.addEventListener("click", () => {
  pdfMenu.classList.toggle("show");
  pdfTools.innerHTML = pdfMenu.classList.contains("show")
    ? '<i class="fa-solid fa-xmark" id="closeIcon"></i>'
    : '<i class="fa-solid fa-ellipsis" id="ellipsisIcon"></i>';
});

fullscreenCheckbox.addEventListener("change", (e) => {
  if (e.target.checked) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

// Sidebar toggle
const burger = document.getElementById("burger");
const sidebar = document.getElementById("sidebar");
const main = document.getElementById("main");
burger.addEventListener("click", () => {
  sidebar.classList.toggle("show");
  burger.classList.toggle("active");
  if (window.innerWidth > 768) main.classList.toggle("shift");
});

const links = sidebar.querySelectorAll("a");
links.forEach((link) =>
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("show");
      burger.classList.remove("active");
      main.classList.remove("shift");
    }
  })
);

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    sidebar.classList.add("show");
    main.classList.add("shift");
    burger.classList.add("active");
  } else {
    sidebar.classList.remove("show");
    main.classList.remove("shift");
    burger.classList.remove("active");
  }
});

// PDF Loader
const PDF_NAME = document.getElementById("title-pdf-name");
const pdfContent = document.getElementById("pdf-content");
const message_404 = "404 File Not Found";
const message_content_404 = `<br><br><br><br><br><br><br><br><h1 style="font-size: 50px; text-align: center;">No Such File Exists.<h1/>`;
let totalPages = 0; // Store total number of pages
let currentPage = 1; // Track current page
let pdf = null; // Store PDF document object

const PDF_LINK = (value, file) => {
  let typeFile, fileName;
  if (value.includes("/novel/")) {
    typeFile = "Novel";
    fileName = "tensura_novel_vol-";
  } else if (value.includes("/manga/")) {
    typeFile = "Manga";
    fileName = "chap-";
  }
  const num = value.match(/\d+/)?.[0]; // Match integer only
  if (!num) return null;
  return file
    ? `${fileName}${num}.pdf`
    : `/Tensura/${typeFile}/v1/${fileName}${num}.pdf`;
};

const renderPage = async (pageNum, canvas) => {
  try {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 6.0 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport,
    }).promise;
    document.getElementById("page-title").textContent = `Page ${pageNum}`;
    document.getElementById("pdf-route-input").value = pageNum;
    document.getElementById("pdf-route-max-value").textContent = totalPages;
    currentPage = pageNum;
  } catch (err) {
    console.error("Page Render Error:", err);
  }
};

const renderPDF = async (pdfPath) => {
  pdfContent.innerHTML = "";
  try {
    console.log("Attempting to load PDF:", pdfPath);
    pdf = await pdfjsLib.getDocument(pdfPath).promise;
    totalPages = pdf.numPages;
    console.log("Total Pages:", totalPages);

    // Create single page container
    const pageContainer = document.createElement("div");
    pageContainer.className = "page-container";
    pageContainer.id = "page-container";

    // Create page top container
    const pageTop = document.createElement("div");
    pageTop.className = "page-top";

    // Create page title
    const pageTitle = document.createElement("div");
    pageTitle.className = "page-title";
    pageTitle.id = "page-title";
    pageTitle.textContent = `Page ${currentPage}`;
    pageTop.appendChild(pageTitle);

    // Create buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "page-buttons";

    // Create Copy Img button
    const copyButton = document.createElement("button");
    copyButton.className = "page-button";
    copyButton.textContent = "Copy Img";
    buttonsContainer.appendChild(copyButton);

    // Create Save Img button
    const saveButton = document.createElement("button");
    saveButton.className = "page-button";
    saveButton.textContent = "Save Img";
    buttonsContainer.appendChild(saveButton);

    pageTop.appendChild(buttonsContainer);
    pageContainer.appendChild(pageTop);

    // Create canvas
    const canvas = document.createElement("canvas");
    pageContainer.appendChild(canvas);

    // Create page navigation
    const pageRouter = document.createElement("div");
    pageRouter.className = "page-pdf-router";
    pageRouter.innerHTML = `
      <button class="pdf-route-btn" id="pdf-route-back"><i class="fa-solid fa-angle-left"></i></button>
      <div class="pdf-route-value">
        <input type="number" min="1" max="${totalPages}" class="pdf-route-input" id="pdf-route-input" value="${currentPage}">
        /<span id="pdf-route-max-value">${totalPages}</span>
      </div>
      <button class="pdf-route-btn" id="pdf-route-next"><i class="fa-solid fa-angle-right"></i></button>
    `;
    pageContainer.appendChild(pageRouter);
    pdfContent.appendChild(pageContainer);

    // Render first page
    await renderPage(currentPage, canvas);

    // Add event listener for Copy Img
    copyButton.addEventListener("click", async () => {
      try {
        await canvas.toBlob(async (blob) => {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          alert("Page image copied to clipboard!");
        });
      } catch (err) {
        console.error("Failed to copy image:", err);
        alert("Failed to copy image to clipboard.");
      }
    });

    // Add event listener for Save Img
    saveButton.addEventListener("click", () => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `page-${currentPage}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // Add event listeners for navigation buttons
    const prevButton = document.getElementById("pdf-route-back");
    const nextButton = document.getElementById("pdf-route-next");
    const pageInput = document.getElementById("pdf-route-input");

    prevButton.addEventListener("click", async () => {
      if (currentPage > 1) {
        currentPage--;
        await renderPage(currentPage, canvas);
      }
    });

    nextButton.addEventListener("click", async () => {
      if (currentPage < totalPages) {
        currentPage++;
        await renderPage(currentPage, canvas);
      }
    });

    pageInput.addEventListener("change", async (e) => {
      const pageNum = parseInt(e.target.value);
      if (pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        await renderPage(currentPage, canvas);
      } else {
        e.target.value = currentPage;
      }
    });

    pageInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const pageNum = parseInt(e.target.value);
        if (pageNum >= 1 && pageNum <= totalPages) {
          currentPage = pageNum;
          await renderPage(currentPage, canvas);
        } else {
          e.target.value = currentPage;
        }
      }
    });
  } catch (err) {
    console.error("PDF Render Error:", err);
    PDF_NAME.innerHTML = message_404;
    document.title = message_404;
    pdfContent.innerHTML = message_content_404;
  }
};

const updatePDFLink = async () => {
  const hash = location.href.split(location.host)[1];
  console.log("Hash:", hash);
  const pdfPath = PDF_LINK(hash, false);
  const pdfName = PDF_LINK(hash, true);
  console.log("PDF Path:", pdfPath);
  console.log("PDF Name:", pdfName);
  if (!pdfPath) {
    console.log("Invalid PDF path, showing 404");
    PDF_NAME.innerHTML = message_404;
    document.title = message_404;
    pdfContent.innerHTML = message_content_404;
    return;
  }
  try {
    console.log("Fetching:", pdfPath);
    const resp = await fetch(pdfPath, { method: "HEAD" });
    console.log("Fetch Status:", resp.status);
    if (resp.ok) {
      PDF_NAME.innerHTML = pdfName;
      document.title = pdfName;
      await renderPDF(pdfPath);
    } else {
      console.log("Fetch failed, showing 404");
      PDF_NAME.innerHTML = message_404;
      document.title = message_404;
      pdfContent.innerHTML = message_content_404;
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    PDF_NAME.innerHTML = message_404;
    document.title = message_404;
    pdfContent.innerHTML = message_content_404;
  }
};

window.addEventListener("hashchange", () => location.reload());
window.addEventListener("load", updatePDFLink);
