function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) throw new Error(`Modal not found: ${id}`);
  modal.classList.add("open");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) throw new Error(`Modal not found: ${id}`);
  modal.classList.remove("open");
}

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-modal]");
  if (closeButton) {
    const modal = closeButton.closest(".modal-backdrop");
    if (modal) modal.classList.remove("open");
    return;
  }

  if (event.target.classList.contains("modal-backdrop")) {
    event.target.classList.remove("open");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-backdrop.open").forEach((modal) => {
      modal.classList.remove("open");
    });
  }
});
