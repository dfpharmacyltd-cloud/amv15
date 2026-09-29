window.addEventListener('error', function(event) {
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: event.error ? event.error.stack : event.message })
  });
});
window.addEventListener('unhandledrejection', function(event) {
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: event.reason ? event.reason.stack : event.reason })
  });
});
