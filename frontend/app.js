const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const dropAreaText = document.getElementById("dropAreaText");

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

const API_BASE = "http://13.61.56.46:8000";
const ACTION_CONFIG = {
  summarize: {
    header: "Summary",
    endpoint: "/summarize",
    streaming: true,
    asMarkdown: true,
  },
  doi: {
    header: "Detected DOI",
    endpoint: "/doi",
    streaming: false,
    asMarkdown: false,
  },
  plagiarism: {
    header: "Plagiarism Check",
    endpoint: "/plagiarism",
    streaming: true,
    asMarkdown: true,
  },
};

btnSummarize.addEventListener("click", () => performAction("summarize"));
btnGetDoi.addEventListener("click", () => performAction("doi"));
btnPlagiarism.addEventListener("click", () => performAction("plagiarism"));

function resetResult() {
  resultCard.style.display = "none";
  resultHeader.textContent = "Result";
  summarySection.style.display = "none";
  summaryText.textContent = "";
  summaryText.innerHTML = "";
}

async function performAction(actionKey) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;

  const cfg = ACTION_CONFIG[actionKey];
  if (!cfg) return;

  resetResult();
  resultHeader.textContent = cfg.header;
  resultCard.style.display = "block";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE}${cfg.endpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    summarySection.style.display = "block";
    summarySection.style.overflowY = "auto";

    if (cfg.streaming && res.body && res.body.getReader) {
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
          renderOutput(fullText, cfg.asMarkdown);
        }
      }
    } else {
      const text = await res.text();
      renderOutput(text, cfg.asMarkdown);
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
