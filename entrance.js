const film = document.querySelector(".scene video");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

film.addEventListener("playing", () => film.toggleAttribute("data-playing", true));
film.addEventListener("error", () => film.removeAttribute("data-playing"));

function updatePlayback() {
  if (reducedMotion.matches || navigator.connection?.saveData || document.hidden) {
    film.pause();
    return;
  }
  if (!film.hasAttribute("src")) film.src = "assets/entrance/island.mp4";
  film.play().catch(() => {
    // The first-frame poster also serves as the entrance when autoplay is blocked.
  });
}

reducedMotion.addEventListener("change", updatePlayback);
document.addEventListener("visibilitychange", updatePlayback);
updatePlayback();
