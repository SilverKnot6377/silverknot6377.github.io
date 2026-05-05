export class CookieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CookieError';
  }
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('workshorts_token');
  
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const defaultOptions: RequestInit = {
    credentials: options.credentials || 'include',
    ...options,
    headers,
  };

  let res = await fetch(url, defaultOptions);
  
  let contentType = res.headers.get("content-type");
  
  // If we get an HTML response from an API call, it might be a cookie check
  if (contentType && contentType.includes("text/html") && url.includes("/api/")) {
    const text = await res.clone().text();
    if (text.includes("Cookie check") || text.includes("Authenticate in new window")) {
      // If we were using credentials, try one more time without them
      if (defaultOptions.credentials !== 'omit') {
        const retryOptions = { ...defaultOptions, credentials: 'omit' as const };
        try {
          const retryRes = await fetch(url, retryOptions);
          if (retryRes.ok && retryRes.headers.get("content-type")?.includes("application/json")) {
            res = retryRes;
            contentType = res.headers.get("content-type");
          } else {
            throw new CookieError("Your browser is blocking security cookies required for this app.");
          }
        } catch (e) {
          if (e instanceof CookieError) throw e;
          throw new CookieError("Your browser is blocking security cookies required for this app.");
        }
      } else {
        throw new CookieError("Your browser is blocking security cookies required for this app.");
      }
    }
  }

  if (contentType && contentType.includes("text/html")) {
    throw new Error("The server returned an unexpected HTML response.");
  }

  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      }
    } catch (e) {
      // Ignore parse error
    }
    throw new Error(errorMsg);
  }

  if (contentType && contentType.includes("application/json")) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Invalid JSON response from server");
    }
  }
  
  return res;
}

export function apiUpload(url: string, formData: FormData, onProgress: (percent: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem('workshorts_token');

    xhr.open('POST', url);
    xhr.withCredentials = true;

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader('content-type');
      let response = xhr.response;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) {
          // ignore
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
      } else {
        const errorMsg = response?.error || `Error ${xhr.status}: ${xhr.statusText}`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload aborted'));

    xhr.send(formData);
  });
}
