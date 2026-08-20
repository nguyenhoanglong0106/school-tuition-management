// Opens a blank tab synchronously (inside the click handler, before any
// `await`) so it still counts as a trusted user gesture, then points it at
// the URL once resolved. Awaiting a signed URL and calling window.open()
// afterwards gets silently popup-blocked by most mobile browsers — this is
// the standard workaround (same pattern already used for print windows).
export function openInNewTab(urlPromise, onError) {
  const win = window.open('', '_blank');
  urlPromise
    .then((url) => {
      if (win) win.location.href = url;
      else window.location.href = url; // even the blank tab got blocked — last resort
    })
    .catch((err) => {
      win?.close();
      onError?.(err);
    });
}
