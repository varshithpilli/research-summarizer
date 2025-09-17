const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const dropAreaText = document.getElementById("dropAreaText");
const uploadSection = document.getElementById("uploadSection");
const actionsSection = document.getElementById("actionsSection");
const uploadedFileName = document.getElementById("uploadedFileName");
let uploadedFileId = null;
let isUploading = false;

["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove("dragover");
  });
});
dropArea.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    fileInput.files = files;
    updateDropText();
  }
});

const browseLink = document.querySelector(".browse-link");
if (browseLink) {
  browseLink.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });
}
dropArea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    fileInput.click();
  }
});
fileInput.addEventListener("change", updateDropText);

function updateDropText() {
  if (fileInput.files && fileInput.files.length > 0) {
    dropAreaText.textContent = fileInput.files[0].name;
    // Trigger auto-upload when a file is selected
    uploadSelectedFile();
  } else {
    dropAreaText.innerHTML =
      'Drag & drop your PDF or DOCX here, or <span style="color:var(--accent-2);text-decoration:underline;cursor:pointer;">browse</span>';
  }
}

// --- New action handlers ---
const btnSummarize = document.getElementById("btnSummarize");
const btnGetDoi = document.getElementById("btnGetDoi");
const btnPlagiarism = document.getElementById("btnPlagiarism");

const resultCard = document.getElementById("resultCard");
const resultHeader = document.getElementById("resultHeader");
const summarySection = document.getElementById("summarySection");
const summaryText = document.getElementById("summaryText");

const API_BASE = "http://13.220.174.139:8000";
// const API_BASE = "http://localhost:8000";

btnSummarize.addEventListener("click", performSummarize);
btnGetDoi.addEventListener("click", performGetDoi);
btnPlagiarism.addEventListener("click", performPlagiarism);

// Disable action buttons and ensure only upload section is visible initially
setActionButtonsEnabled(false);
if (actionsSection) actionsSection.style.display = "none";
if (uploadSection) uploadSection.style.display = "block";

function resetResult() {
  resultCard.style.display = "none";
  resultHeader.textContent = "Result";
  summarySection.style.display = "none";
  summaryText.textContent = "";
  summaryText.innerHTML = "";
}

async function performSummarize() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  resetResult();
  resultHeader.textContent = "Summary";
  resultCard.style.display = "block";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/summarize`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    summarySection.style.display = "block";
    summarySection.style.overflowY = "auto";

    if (res.body && res.body.getReader) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          renderOutput(fullText, true); // asMarkdown = true
        }
      }
    } else {
      const text = await res.text();
      renderOutput(text, true);
    }
  } catch (err) {
    summaryText.textContent = "Error: " + err.message;
    summarySection.style.display = "block";
    summarySection.style.overflowY = "hidden";
  }
}


async function performGetDoi() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  resetResult();
  resultHeader.textContent = "Detected DOI";
  resultCard.style.display = "block";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/doi`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    const rawText = await res.text();
    summarySection.style.display = "block";
    summarySection.style.overflowY = "hidden";

    // Format as markdown
    const markdownFormatted = formatDoiResponseToMarkdown(rawText);
    renderOutput(markdownFormatted, true);
  } catch (err) {
    summaryText.textContent = "Error: " + err.message;
    summarySection.style.display = "block";
    summarySection.style.overflowY = "hidden";
  }
}


function formatDoiResponseToMarkdown(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  let formatted = "";

  lines.forEach((line) => {
    if (line.startsWith("doi: ")) {
      const doi = line.slice(5).trim();
      formatted += `**DOI:** [${doi}](https://doi.org/${doi})\n\n`;
    } else if (line.startsWith("http")) {
      formatted += `[${line}](${line})\n\n`;
    } else {
      formatted += `${line}\n\n`;
    }
  });

  return formatted;
}


// async function performGetDoi() {
//   const file = fileInput.files && fileInput.files[0];
//   if (!file) return;

//   resetResult();
//   resultHeader.textContent = "Detected DOI";
//   resultCard.style.display = "block";

//   const formData = new FormData();
//   formData.append("file", file);

//   try {
//     const res = await fetch(`${API_BASE}/doi`, {
//       method: "POST",
//       body: formData,
//     });

//     if (!res.ok) throw new Error(`Request failed (${res.status})`);

//     const text = await res.text();

//     summarySection.style.display = "block";
//     summarySection.style.overflowY = "hidden";

//     renderOutput(text, true);
//   } catch (err) {
//     summaryText.textContent = "Error: " + err.message;
//     summarySection.style.display = "block";
//     summarySection.style.overflowY = "hidden";
//   }
// }


async function performPlagiarism() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  resetResult();
  resultHeader.textContent = "Plagiarism Check";
  resultCard.style.display = "block";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/plagiarism`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    summarySection.style.display = "block";
    summarySection.style.overflowY = "auto";

    if (res.body && res.body.getReader) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          renderOutput(fullText, true); // asMarkdown = true
        }
      }
    } else {
      const text = await res.text();
      renderOutput(text, true);
    }
  } catch (err) {
    summaryText.textContent = "Error: " + err.message;
    summarySection.style.display = "block";
    summarySection.style.overflowY = "hidden";
  }
}

function renderOutput(text, asMarkdown) {
  if (asMarkdown) {
    const newHTML = DOMPurify.sanitize(marked.parse(text));
    summaryText.innerHTML = newHTML;
  } else {
    summaryText.textContent = text;
  }
  summaryText.scrollTop = summaryText.scrollHeight;
}

async function uploadSelectedFile() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  isUploading = true;
  setActionButtonsEnabled(false);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`Upload failed (${res.status})`);

    if (uploadedFileName && file && file.name) uploadedFileName.textContent = file.name;
    if (uploadSection) uploadSection.style.display = "none";
    if (actionsSection) actionsSection.style.display = "block";
    setActionButtonsEnabled(true);
  } catch (err) {
    uploadedFileId = null;
    console.error(err);
    resultCard.style.display = "block";
    resultHeader.textContent = "Upload Error";
    summarySection.style.display = "block";
    summarySection.style.overflowY = "hidden";
    summaryText.textContent = "Error: " + err.message;
    if (uploadSection) uploadSection.style.display = "block";
    if (actionsSection) actionsSection.style.display = "none";
  } finally {
    isUploading = false;
  }
}

function setActionButtonsEnabled(enabled) {
  btnSummarize.disabled = !enabled;
  btnGetDoi.disabled = !enabled;
  btnPlagiarism.disabled = !enabled;
}
