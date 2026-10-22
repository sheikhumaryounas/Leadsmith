// Thin wrapper over fetch. The session lives in an httpOnly cookie, so requests just include credentials.
async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const err = new Error(data?.error || `Something went wrong (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

// PDFs are served by the API; they open in a new tab so the browser's viewer handles them.
export const pdfUrl = (path) => `/api${path}`;
