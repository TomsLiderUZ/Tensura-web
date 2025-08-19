// Import List
const IMPORT_LIST = [
  {
    title: "Tensura Volume 1",
    name: "Volume 1",
    link: "/novel/1",
    page: {
      start: 1,
      end: 2,
      block: [
        3, 5, 7, 8, 9, 10, 11, 19, 25, 46, 65, 67, 73, 75, 118, 127, 129, 157, 194,
        196, 213, 227, 245, 250, 254, 256, 258, 260, 287,
      ],
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
  {
    title: "Tensura Volume 3",
    name: "Volume 3",
    link: "/novel/3",
    page: {
      start: 1,
      end: null,
      block: [],
    },
  },
  {
    title: "Tensura Volume 4",
    name: "Volume 4",
    link: "/novel/4",
    page: {
      start: null,
      end: null,
      block: [],
    },
  },
  {
    title: "Tensura Volume 5",
    name: "Volume 5",
    link: "/novel/5",
    page: {
      start: null,
      end: null,
      block: [],
    },
  },
];

// PDF Tools
const pdfTools = document.getElementById("pdf_tools");
const pdfMenu = document.getElementById("pdf_tools_menu");
const fullscreenCheckbox = document.getElementById("fullscreenCheck");

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

// Populate sidebar from IMPORT_LIST
const sidebarUl = sidebar.querySelector("ul");
sidebarUl.innerHTML = IMPORT_LIST.map(
  (item) => `<li><a href="#${item.link}">${item.name}</a></li>`
).join("");
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

// PDF Loader
const PDF_NAME = document.getElementById("title-pdf-name");
const pdfContent = document.getElementById("pdf-content");
const loadingMessage = document.getElementById("loading-message"); // Assuming you have <div id="loading-message" style="display: none; text-align: center; font-size: 24px; margin-top: 50px;">Loading...</div> in HTML
const message_404 = "404 File Not Found";
const message_content_404 = `<br><br><br><br><br><br><br><br><h1 style="font-size: 50px; text-align: center;">No Such File Exists.<h1/>`;
let totalPages = 0; // Store total number of pages
let currentDisplayed = 1; // Track current displayed page index (1-based)
let pdf = null; // Store PDF document object
let currentVolume = null; // Store current volume from IMPORT_LIST
let visiblePages = []; // Array of original page numbers that are visible

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

const buildVisiblePages = (totalPages, volume) => {
  const { start, end, block } = volume.page;
  const pages = [];

  // Add start page as first
  if (start >= 1 && start <= totalPages && !block.includes(start)) {
    pages.push(start);
  }

  // Add all non-blocked pages except start and end
  for (let i = 1; i <= totalPages; i++) {
    if (i !== start && i !== end && !block.includes(i)) {
      pages.push(i);
    }
  }

  // Add end page as last
  if (end >= 1 && end <= totalPages && !block.includes(end) && start !== end) {
    pages.push(end);
  }

  return pages;
};

const renderPage = async (displayedNum, canvas) => {
  try {
    const originalPage = visiblePages[displayedNum - 1];
    if (!originalPage) throw new Error("Invalid page number");
    const page = await pdf.getPage(originalPage);
    const viewport = page.getViewport({ scale: 6.0 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport,
    }).promise;
    document.getElementById("page-title").textContent = `Page ${originalPage}`;
    document.getElementById("pdf-route-input").value = displayedNum;
    document.getElementById("pdf-route-max-value").textContent =
      visiblePages.length;
    currentDisplayed = displayedNum;
  } catch (err) {
    console.error("Page Render Error:", err);
  }
};

const renderPDF = async (pdfPath, volume) => {
  pdfContent.innerHTML = ""; // Clear previous content
  if (loadingMessage) loadingMessage.style.display = "block"; // Show loading

  try {
    console.log("Attempting to load PDF:", pdfPath);
    pdf = await pdfjsLib.getDocument(pdfPath).promise;
    totalPages = pdf.numPages;
    currentVolume = volume;
    console.log("Total Pages:", totalPages, "Volume:", volume);

    // Compute visible pages
    visiblePages = buildVisiblePages(totalPages, volume);
    console.log("Visible Pages:", visiblePages);

    if (visiblePages.length === 0) {
      throw new Error("No visible pages available.");
    }

    if (loadingMessage) loadingMessage.style.display = "none"; // Hide loading

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
    pageTitle.textContent = `Page ${visiblePages[0]}`;
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
        <input type="number" min="1" max="${visiblePages.length}" class="pdf-route-input" id="pdf-route-input" value="1">
        /<span id="pdf-route-max-value">${visiblePages.length}</span>
      </div>
      <button class="pdf-route-btn" id="pdf-route-next"><i class="fa-solid fa-angle-right"></i></button>
    `;
    pageContainer.appendChild(pageRouter);
    pdfContent.appendChild(pageContainer);

    // Render initial page
    await renderPage(1, canvas);

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
        a.download = `page-${visiblePages[currentDisplayed - 1]}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // Add event listeners for navigation buttons
    const prevButton = document.getElementById("pdf-route-back");
    const nextButton = document.getElementById("pdf-route-next");
    const pageInput = document.getElementById("pdf-route-input");

    prevButton.addEventListener("click", async () => {
      if (currentDisplayed > 1) {
        currentDisplayed--;
        await renderPage(currentDisplayed, canvas);
      }
    });

    nextButton.addEventListener("click", async () => {
      if (currentDisplayed < visiblePages.length) {
        currentDisplayed++;
        await renderPage(currentDisplayed, canvas);
      }
    });

    pageInput.addEventListener("change", async (e) => {
      const displayedNum = parseInt(e.target.value);
      if (displayedNum >= 1 && displayedNum <= visiblePages.length) {
        currentDisplayed = displayedNum;
        await renderPage(currentDisplayed, canvas);
      } else {
        e.target.value = currentDisplayed;
      }
    });

    pageInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        const displayedNum = parseInt(e.target.value);
        if (displayedNum >= 1 && displayedNum <= visiblePages.length) {
          currentDisplayed = displayedNum;
          await renderPage(currentDisplayed, canvas);
        } else {
          e.target.value = currentDisplayed;
        }
      }
    });
  } catch (err) {
    console.error("PDF Render Error:", err);
    if (loadingMessage) loadingMessage.style.display = "none"; // Hide loading on error
    PDF_NAME.innerHTML = message_404;
    document.title = message_404;
    pdfContent.innerHTML = message_content_404;
  }
};

const updatePDFLink = async () => {
  const hash = location.href.split(location.host)[1] || "/novel/1"; // Default to /novel/1
  console.log("Hash:", hash);
  const volume =
    IMPORT_LIST.find((item) => item.link === hash.split("#")[1]) ||
    IMPORT_LIST[0];
  const pdfPath = PDF_LINK(hash, false);
  const pdfName = PDF_LINK(hash, true);
  console.log("PDF Path:", pdfPath);
  console.log("PDF Name:", pdfName);
  console.log("Volume:", volume);
  if (!pdfPath || !volume) {
    console.log("Invalid PDF path or volume, showing 404");
    if (loadingMessage) loadingMessage.style.display = "none";
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
      PDF_NAME.innerHTML = volume.title;
      document.title = volume.title;
      await renderPDF(pdfPath, volume);
    } else {
      console.log("Fetch failed, showing 404");
      if (loadingMessage) loadingMessage.style.display = "none";
      PDF_NAME.innerHTML = message_404;
      document.title = message_404;
      pdfContent.innerHTML = message_content_404;
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    if (loadingMessage) loadingMessage.style.display = "none";
    PDF_NAME.innerHTML = message_404;
    document.title = message_404;
    pdfContent.innerHTML = message_content_404;
  }
};

window.addEventListener("hashchange", () => location.reload());
window.addEventListener("load", updatePDFLink);