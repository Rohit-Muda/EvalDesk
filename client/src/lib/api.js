const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(function() { return {}; });
  if (!res.ok) throw new Error(data.error || data.message || res.statusText);
  return data;
}

export const auth = {
  me: function() { return api('/auth/me'); },
  logout: function() { return api('/auth/logout', { method: 'POST' }); },
};

export const events = {
  list: function() { return api('/events'); },
  get: function(id) { return api('/events/' + id); },
  create: function(body) { return api('/events', { method: 'POST', body: JSON.stringify(body) }); },
  update: function(id, body) { return api('/events/' + id, { method: 'PATCH', body: JSON.stringify(body) }); },
  delete: function(id) { return api('/events/' + id, { method: 'DELETE' }); },
};

export const teams = {
  list: function(eventId) { return api('/teams/event/' + eventId); },
  preview: function(eventId, csv) { return api('/teams/event/' + eventId + '/preview', { method: 'POST', body: JSON.stringify({ csv: csv }) }); },
  import: function(eventId, csv) { return api('/teams/event/' + eventId + '/import', { method: 'POST', body: JSON.stringify({ csv: csv }) }); },
  byToken: function(qrToken) { return api('/teams/by-token/' + qrToken); },
};

export const scores = {
  get: function(qrToken) { return api('/scores/team/' + qrToken); },
  submit: function(qrToken, body) { return api('/scores/team/' + qrToken, { method: 'POST', body: JSON.stringify(body) }); },
  update: function(qrToken, body) { return api('/scores/team/' + qrToken, { method: 'PATCH', body: JSON.stringify(body) }); },
};

export const jury = {
  allocations: function(eventId) { return api('/jury/event/' + eventId + '/allocations'); },
  addAllocation: function(eventId, body) { return api('/jury/event/' + eventId + '/allocations', { method: 'POST', body: JSON.stringify(body) }); },
  removeAllocation: function(eventId, id) { return api('/jury/event/' + eventId + '/allocations/' + id, { method: 'DELETE' }); },
  myTeams: function(eventId) { return api('/jury/event/' + eventId + '/my-teams'); },
};

export const tracking = {
  stats: function(eventId) { return api('/tracking/event/' + eventId); },
  exportCsv: function(eventId) {
    const token = getToken();
    return fetch(BASE + '/tracking/event/' + eventId + '/export', {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      credentials: 'include',
    });
  },
};
