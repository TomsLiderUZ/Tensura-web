const IMPORT_LIST = EXPORT_LIST;

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

const PDF_DOWNLOAD_PASSWORD = atob(
  atob(atob(atob(atob("VjJ0V2ExWXlVbGhVV0hCWFltMTRZVlpXVVhkUFVUMDk="))))
);

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
const message_404 = "404 File Not Found";
const message_content_404 = `<br><br><br><br><br><br><br><br><h1 style="font-size: 50px; text-align: center;">No Such File Exists.</h1>`;
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
    document.getElementById("page-title").textContent = `Page ${displayedNum}`;
    document.getElementById("pdf-route-input").value = displayedNum;
    document.getElementById("pdf-route-max-value").textContent =
      visiblePages.length;
    currentDisplayed = displayedNum;
  } catch (err) {
    console.error("Page Render Error:", err);
  }
};

const getPageImageURL = async (pdfPath, startPage) => {
  try {
    const pdf = await pdfjsLib.getDocument(pdfPath).promise;
    const totalPages = pdf.numPages;
    if (startPage === null || startPage < 1 || startPage > totalPages) {
      return ""; // Return empty string if start page is invalid
    }
    const page = await pdf.getPage(startPage);
    const targetWidth = 2400;
    const targetHeight = 3600;
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(
      targetWidth / viewport.width,
      targetHeight / viewport.height
    );
    const scaledViewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    // Center the page in the canvas
    const offsetX = (targetWidth - scaledViewport.width) / 2;
    const offsetY = (targetHeight - scaledViewport.height) / 2;
    context.translate(offsetX, offsetY);
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;
    return canvas.toDataURL("image/png", 1.0); // Quality set to maximum
  } catch (err) {
    console.error("Error generating page image:", err);
    return "";
  }
};

const saveEditedPDF = async (pdfPath, visiblePages, volumeTitle) => {
  try {
    // Load the original PDF
    const response = await fetch(pdfPath);
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

    // Create a new PDF document
    const newPdfDoc = await PDFLib.PDFDocument.create();

    // Copy only the visible pages to the new PDF
    const copiedPages = await newPdfDoc.copyPages(
      pdfDoc,
      visiblePages.map((page) => page - 1)
    );
    copiedPages.forEach((page) => newPdfDoc.addPage(page));

    // Save the new PDF
    const pdfBytesNew = await newPdfDoc.save();
    const blob = new Blob([pdfBytesNew], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${volumeTitle}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to save edited PDF:", err);
    alert("Failed to save edited PDF.");
  }
};

const renderPDF = async (pdfPath, volume) => {
  pdfContent.innerHTML = "";
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

    // Create Save Pdf button
    const savePdfButton = document.createElement("button");
    savePdfButton.className = "page-button";
    savePdfButton.textContent = "Save PDF";
    buttonsContainer.appendChild(savePdfButton);

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

    // Add event listener For Save Img
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

    // Add event listener for Save PDF
    savePdfButton.addEventListener("click", async () => {
      const password = prompt("Enter password to download edited PDF:");
      if (password === PDF_DOWNLOAD_PASSWORD) {
        await saveEditedPDF(pdfPath, visiblePages, currentVolume.title);
      } else {
        alert("Incorrect password. PDF download aborted.");
      }
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
    PDF_NAME.innerHTML = message_404;
    document.title = message_404;
    pdfContent.innerHTML = message_content_404;
  }
};

const renderDefaultCards = async () => {
  PDF_NAME.innerHTML = "All available";
  document.title = "All available";
  const cards = await Promise.all(
    IMPORT_LIST.map(async (item) => {
      const pdfPath = PDF_LINK(item.link, false);
      const imageSrc = await getPageImageURL(pdfPath, item.page.start);
      return `
        <a href="#${item.link}" class="page-card-container">
          <img src="${imageSrc}" alt="${item.title}" class="page-card-img">
          <div class="page-card-title">${item.title}</div>
        </a>
      `;
    })
  );
  pdfContent.innerHTML = cards.join("");
};

const updatePDFLink = async () => {
  const hash = location.href.split(location.host)[1];
  console.log("Hash:", hash);

  // If no hash or hash is just "/", render default cards
  if (!hash || hash === "/" || hash === "/#") {
    await renderDefaultCards();
    return;
  }

  const pdfPath = PDF_LINK(hash, false);
  const pdfName = PDF_LINK(hash, true);
  const volume =
    IMPORT_LIST.find((item) => item.link === hash.split("#")[1]) ||
    IMPORT_LIST[0];
  console.log("PDF Path:", pdfPath);
  console.log("PDF Name:", pdfName);
  console.log("Volume:", volume);

  if (!pdfPath || !volume) {
    console.log("Invalid PDF path or volume, showing default cards");
    await renderDefaultCards();
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
      console.log("Fetch failed, showing default cards");
      await renderDefaultCards();
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    await renderDefaultCards();
  }
};

window.addEventListener("hashchange", () => location.reload());
window.addEventListener("load", updatePDFLink);
