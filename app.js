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

document
  .getElementById("uploadForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const summarySection = document.getElementById("summarySection");
    const summaryText = document.getElementById("summaryText");
    summarySection.style.display = "none";
    summaryText.textContent = "";

    try {
      const response = await fetch("http://localhost:8000/summarize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to get summary");
      summarySection.style.display = "block";
      summarySection.style.overflowY = "auto";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          const newHTML = DOMPurify.sanitize(marked.parse(fullText));
          summaryText.innerHTML = newHTML;
          summaryText.scrollTop = summaryText.scrollHeight;
        }
      }
    } catch (err) {
      summaryText.textContent = "Error: " + err.message;
      summarySection.style.display = "block";
      summarySection.style.overflowY = "hidden";
    }
  });
