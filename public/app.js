const state = {
  artists: [],
  albums: [],
  songs: [],
  users: [],
  playlists: [],
  summary: null,
  reports: []
};

const endpoints = ['artists', 'albums', 'songs', 'users', 'playlists'];
const statusText = document.querySelector('#statusText');
const autoSaveTimeouts = new Map();

function setStatus(message) {
  statusText.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function optionList(items, labelGetter) {
  return items
    .map((item) => `<option value="${item._id}">${labelGetter(item)}</option>`)
    .join('');
}

function fillSelect(selector, items, labelGetter) {
  document.querySelectorAll(selector).forEach((select) => {
    const selected = select.value;
    select.innerHTML = optionList(items, labelGetter);
    if ([...select.options].some((option) => option.value === selected)) {
      select.value = selected;
    }
  });
}

function formatDuration(seconds) {
  const value = Number(seconds || 0);
  const minutes = Math.floor(value / 60);
  const remainder = String(value % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function table(target, columns, rows, actions) {
  const element = document.querySelector(target);
  if (!rows.length) {
    element.innerHTML = '<tbody><tr><td class="empty">No records yet.</td></tr></tbody>';
    return;
  }

  const head = columns.map((column) => `<th>${column.label}</th>`).join('') + '<th>Actions</th>';
  const body = rows.map((row) => {
    const cells = columns.map((column) => `<td>${column.value(row) ?? ''}</td>`).join('');
    return `<tr>${cells}<td><div class="row-actions">${actions(row)}</div></td></tr>`;
  }).join('');

  element.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

function actionButtons(type, row) {
  return `
    <button class="secondary" type="button" data-edit="${type}" data-id="${row._id}">Edit</button>
    <button class="danger" type="button" data-delete="${type}" data-id="${row._id}">Delete</button>
  `;
}

function renderMetrics() {
  const counts = state.summary?.counts || {};
  const labels = [
    ['artists', 'Artists'],
    ['albums', 'Albums'],
    ['songs', 'Songs'],
    ['users', 'Users'],
    ['playlists', 'Playlists'],
    ['listens', 'Plays']
  ];

  document.querySelector('#metrics').innerHTML = labels.map(([key, label]) => `
    <div class="metric">
      <span>${label}</span>
      <strong>${formatNumber(counts[key])}</strong>
    </div>
  `).join('');
}

function renderDashboard() {
  renderMetrics();

  document.querySelector('#topSongsBody').innerHTML = (state.summary?.topSongs || []).map((song) => `
    <tr>
      <td>${song.title}</td>
      <td>${song.artist?.name || 'Unknown'}</td>
      <td><span class="pill">${song.genre}</span></td>
      <td>${formatNumber(song.streams)}</td>
    </tr>
  `).join('');

  document.querySelector('#playReport').innerHTML = state.reports.map((item) => `
    <div>
      <strong>${item.song.title}</strong>
      <span>${item.artist?.name || 'Unknown'} - ${item.plays} recorded play${item.plays === 1 ? '' : 's'}</span>
    </div>
  `).join('') || '<p class="empty">No play activity recorded yet.</p>';
}

function renderTables() {
  table('#artistsTable', [
    { label: 'Name', value: (row) => row.name },
    { label: 'Country', value: (row) => row.country },
    { label: 'Genre', value: (row) => `<span class="pill">${row.genre}</span>` },
    { label: 'Monthly listeners', value: (row) => formatNumber(row.monthlyListeners) }
  ], state.artists, (row) => actionButtons('artists', row));

  table('#albumsTable', [
    { label: 'Title', value: (row) => row.title },
    { label: 'Artist', value: (row) => row.artist?.name || 'Unknown' },
    { label: 'Release year', value: (row) => row.releaseYear },
    { label: 'Label', value: (row) => row.label }
  ], state.albums, (row) => actionButtons('albums', row));

  table('#songsTable', [
    { label: 'Title', value: (row) => row.title },
    { label: 'Artist', value: (row) => row.artist?.name || 'Unknown' },
    { label: 'Album', value: (row) => row.album?.title || 'Unknown' },
    { label: 'Genre', value: (row) => `<span class="pill">${row.genre}</span>` },
    { label: 'Duration', value: (row) => formatDuration(row.durationSeconds) },
    { label: 'Streams', value: (row) => formatNumber(row.streams) }
  ], state.songs, (row) => actionButtons('songs', row));

  table('#usersTable', [
    { label: 'Name', value: (row) => row.name },
    { label: 'Email', value: (row) => row.email },
    { label: 'Plan', value: (row) => `<span class="pill">${row.plan}</span>` },
    { label: 'Status', value: (row) => row.status },
    { label: 'Joined', value: (row) => formatDate(row.joinedAt) }
  ], state.users, (row) => actionButtons('users', row));

  table('#playlistsTable', [
    { label: 'Name', value: (row) => row.name },
    { label: 'Owner', value: (row) => row.owner?.name || 'Unknown' },
    { label: 'Visibility', value: (row) => row.visibility },
    { label: 'Songs', value: (row) => (row.songs || []).map((song) => song.title).join(', ') },
    { label: 'Description', value: (row) => row.description }
  ], state.playlists, (row) => actionButtons('playlists', row));
}

function renderForms() {
  fillSelect('select[name="artistId"]', state.artists, (artist) => artist.name);
  fillSelect('select[name="albumId"]', state.albums, (album) => `${album.title} (${album.artist?.name || 'Unknown'})`);
  fillSelect('select[name="ownerId"], select[name="userId"]', state.users, (user) => `${user.name} - ${user.plan}`);
  fillSelect('select[name="songId"], select[name="songIds"]', state.songs, (song) => `${song.title} - ${song.artist?.name || 'Unknown'}`);
}

function render() {
  renderForms();
  renderDashboard();
  renderTables();
}

async function loadAll() {
  setStatus('Loading records...');
  const [summary, reports, ...collections] = await Promise.all([
    api('/api/summary'),
    api('/api/reports/top-songs'),
    ...endpoints.map((endpoint) => api(`/api/${endpoint}`))
  ]);

  state.summary = summary;
  state.reports = reports;
  endpoints.forEach((endpoint, index) => {
    state[endpoint] = collections[index];
  });
  render();
  setStatus('Connected to MongoDB backend. Auto-save enabled.');
}

function formToObject(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  if (form.elements.explicit) {
    payload.explicit = form.elements.explicit.checked;
  }
  if (form.elements.songIds) {
    payload.songIds = [...form.elements.songIds.selectedOptions].map((option) => option.value);
  }
  return payload;
}

async function saveRecord(type, form) {
  const payload = formToObject(form);
  const id = payload._id;
  delete payload._id;

  await api(id ? `/api/${type}/${id}` : `/api/${type}`, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(payload)
  });

  form.reset();
  await loadAll();
  setStatus(`${type.slice(0, -1)} saved.`);
}

async function updateRecord(type, form) {
  const payload = formToObject(form);
  const id = payload._id;
  if (!id) {
    return;
  }
  delete payload._id;

  await api(`/api/${type}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

function scheduleAutoSave(type, form) {
  const id = form.elements._id?.value;
  if (!id) return;

  const key = `${type}:${id}`;
  clearTimeout(autoSaveTimeouts.get(key));
  autoSaveTimeouts.set(key, setTimeout(async () => {
    try {
      await updateRecord(type, form);
      await loadAll();
      setStatus(`${type.slice(0, -1)} auto-saved.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      autoSaveTimeouts.delete(key);
    }
  }, 800));
}

function fillForm(form, record) {
  Object.entries(record).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;

    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else if (field.type === 'date') {
      field.value = formatDate(value);
    } else if (field.multiple && Array.isArray(value)) {
      [...field.options].forEach((option) => {
        option.selected = value.includes(option.value) || value.some((item) => item.toString?.() === option.value);
      });
    } else {
      field.value = value?._id || value || '';
    }
  });
}

function editRecord(type, id) {
  const singular = type.slice(0, -1);
  const form = document.querySelector(`#${singular}Form`);
  const record = state[type].find((item) => item._id === id);
  if (!form || !record) return;

  const editable = { ...record };
  if (type === 'playlists') {
    editable.songIds = (record.songIds || []).map(String);
  }
  fillForm(form, editable);
  document.querySelector(`[data-tab="${type}"]`)?.click();
}

async function deleteRecord(type, id) {
  await api(`/api/${type}/${id}`, { method: 'DELETE' });
  await loadAll();
  setStatus(`${type.slice(0, -1)} deleted.`);
}

document.querySelectorAll('.tab').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    button.classList.add('active');
    document.querySelector(`#${button.dataset.tab}View`).classList.add('active');
  });
});

document.querySelector('#refreshButton').addEventListener('click', loadAll);
document.querySelector('#seedButton').addEventListener('click', async () => {
  setStatus('Seeding sample data...');
  await api('/api/seed', { method: 'POST', body: '{}' });
  await loadAll();
  setStatus('Sample data seeded.');
});

document.querySelector('#listenForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  await api('/api/listens', {
    method: 'POST',
    body: JSON.stringify(formToObject(event.currentTarget))
  });
  await loadAll();
  setStatus('Play recorded.');
});

[
  ['artistForm', 'artists'],
  ['albumForm', 'albums'],
  ['songForm', 'songs'],
  ['userForm', 'users'],
  ['playlistForm', 'playlists']
].forEach(([formId, type]) => {
  const form = document.querySelector(`#${formId}`);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveRecord(type, event.currentTarget).catch((error) => setStatus(error.message));
  });

  form.addEventListener('change', () => {
    scheduleAutoSave(type, form);
  });

  form.addEventListener('reset', () => {
    const id = form.elements._id?.value;
    if (id) {
      const key = `${type}:${id}`;
      clearTimeout(autoSaveTimeouts.get(key));
      autoSaveTimeouts.delete(key);
    }
  });
});

document.body.addEventListener('click', async (event) => {
  const editType = event.target.dataset.edit;
  const deleteType = event.target.dataset.delete;

  if (editType) {
    editRecord(editType, event.target.dataset.id);
  }

  if (deleteType) {
    await deleteRecord(deleteType, event.target.dataset.id).catch((error) => setStatus(error.message));
  }
});

loadAll().catch((error) => {
  setStatus(`${error.message}. Start MongoDB, run npm install, then npm start.`);
});
