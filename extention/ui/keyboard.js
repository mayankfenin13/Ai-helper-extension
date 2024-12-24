export function isCommandK(e) {
  return e.key === "k" && (e.metaKey || e.ctrlKey);
}

export function handleKeyboardNavigation(e, palette) {
  if (!palette.isVisible) return;

  switch (e.key) {
    case "Escape":
      palette.hide();
      break;
    case "Enter":
      const selectedItem = palette.filteredItems[palette.selectedIndex];
      if (selectedItem) {
        palette.executeCommand(selectedItem);
      }
      break;
  }
}
