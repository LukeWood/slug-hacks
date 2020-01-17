import Toastify from 'toastify-js'

export function show_error_banner(text, opts?) {
  if (typeof text == "object") {
    text = JSON.stringify(text);
  }
  if (!(opts && opts.disable_log)) {
    console.error(text);
  }
  Toastify(
    {
      text,
      close: true,
      duration: 7500,
      backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
    },
  ).showToast();
}
